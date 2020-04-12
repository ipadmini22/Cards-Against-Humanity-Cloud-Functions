import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
const cors = require('cors')({origin: true});

admin.initializeApp();
const db = admin.firestore();


export class Game {
    id!: string;
    creationdate: any;
    creatorId!: string;
    creatorName!: string;
    currounds!: number;
    finished!: boolean;
    maxrounds!: number;
    name!: string;
    provisioned!: boolean;
    scoreboard!: Map<string, number>;
    playerIds!: string[];
}

export class Deck {
    id!: string;
    cards!: SimpleCard[];
}

export class SimpleCard {
    id!: string;
    text!: string;
}
export class Card {
    id!: string;
    creationdate: any;
    creator!: string;
    text!: string;
    creatorId!: string;
}


export const getBlackCard = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        const gameId = req.query.gameId;
        const game = await (await db.doc('games/' + gameId).get()).data() as Game;
        const currentBlackCard = await db.collection('games/' + gameId + '/black-cards').orderBy('sortIndex','asc').startAt(game.currounds).limit(1).get().then(r => {
            return r.docs.map(d => {
                const data = d.data();
                const id = d.id;
                return { id, ...(data as {}) } as any;
            });
        });
        res.send(JSON.stringify(currentBlackCard[0]));
    });
    

  });

export const provisionGameHttp = functions.https.onRequest(async (req, res) => {
    const id = req.query.id;

    const data = await (await db.doc('games/' + id).get()).data() as Game;
    // Get Cards
    const blackCards: Card[] = shuffle(await getBlackCards());
    const whiteCards: Card[] = shuffle(await getWhiteCards());

    for(let p = 0; p < data.playerIds.length; p++) {
        const deck = new Deck();
        deck.id = data.playerIds[p];
        deck.cards = [];
        for(let i = p * 10; i < whiteCards.length && i < (p+1) * 10; i++) {
            deck.cards.push({
                id: whiteCards[i].id,
                text: whiteCards[i].text
            });
        }
        await db.collection('games/' + id + '/decks').doc(data.playerIds[p]).set({
            cards: deck.cards
        });
    }

    // Generate Stacks
    for(let i = 0; i < blackCards.length; i++) {
        await db.collection('games/' + id + '/black-cards').add({
            id: blackCards[i].id,
            text: blackCards[i].text,
            sortIndex: i
        });
    }
    for(let i = data.playerIds.length * 10; i < whiteCards.length; i++) {
        await db.collection('games/' + id + '/white-cards').add({
            id: whiteCards[i].id,
            text: whiteCards[i].text,
            sortIndex: i
        });
    }

    // Generate Checkins
    await db.collection('games/' + id + '/checkins').doc('checkins').set({});

    return null;

  });



async function getBlackCards() {
    const cards = db.collection('black-cards').get().then(r => {
        return r.docs.map(d => {
            const data = d.data();
            const id = d.id;
            return { id, ...(data as {}) } as any;
        });
    });
    return cards;
}

async function getWhiteCards() {
    const cards = db.collection('white-cards').get().then(r => {
        return r.docs.map(d => {
            const data = d.data();
            const id = d.id;
            return { id, ...(data as {}) } as any;
        });
    });
    return cards;
}

function shuffle(array: any[]) {
    let currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

