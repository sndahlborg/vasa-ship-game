// ============================================================
// VASA: THE SUNKEN PRIDE
// An educational RPG about the Vasa warship (1628)
// Pokemon-style adventure — learn history through exploration
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Global State
const TILE = 32;
const COLS = 25;
const ROWS = 18;

let gameState = 'title'; // title, nameEntry, prologue, overworld, dialogue, battle, battleIntro, victory, diploma, mapTransition, slideshow
let keys = {};
let frameCount = 0;

let playerData = {
    x: 5, y: 8, dir: 'down', moving: false, moveProgress: 0, targetX: 5, targetY: 8,
    xp: 0, level: 1, hp: 100, maxHp: 100, wisdom: 10,
    questionsAnswered: 0, correctAnswers: 0,
    defeatedBosses: [],
    currentMap: 'shipyard', name: 'Erik',
    hasLogbook: false, hasBoat: false, talkedToNpcs: []
};

let currentDialogue = null, dialogueIndex = 0, dialogueCharIndex = 0, dialogueTimer = 0;
let dialogueComplete = false, dialogueCallback = null;
let battleState = null;
let titleSelection = 0, titleBlink = 0;
let mapTransitionAlpha = 0, mapTransitionDir = 0, mapTransitionTarget = null;
let screenShake = 0;
let particles = [];
let prologueStep = 0, prologueTimer = 0, prologueTextTimer = 0;
let diplomaTimer = 0, diplomaPhase = 0;
let slideshowIndex = 0, slideshowTimer = 0, slideshowAlpha = 0;
let codexOpen = false, codexPage = 0;

// ── Color Palette ─────────────────────────────────────────────────────────────
const PAL = {
    bg: '#0a0f1a', water: '#0a3060', waterLight: '#1a5090',
    wood: '#6b4020', woodLight: '#8b5a30', woodDark: '#4a2a10',
    stone: '#7a7560', stoneLight: '#9a9580',
    wall: '#5a4530', wallTop: '#7a6548',
    roof: '#3a2a18', sand: '#c8b890', grass: '#3a5a2a', grassLight: '#4a7a38',
    dock: '#8b6040', dockLight: '#a07050',
    swBlue: '#006AA7', swYellow: '#FECC02',
    gold: '#d4a800', parchment: '#f0e8d0', ink: '#1a1208',
    white: '#ffffff', black: '#000000',
    textBg: '#0a1020', textBorder: '#2050a0',
    hpGreen: '#30c830', hpYellow: '#d8d830', hpRed: '#d83030', xpBlue: '#3070d8',
    npcCoat: '#1a3a6a', npcSkin: '#ddb890', npcHair: '#c0a060',
    museum: '#d0c8b8', museumWall: '#b0a898', cannon: '#505050',
    seaweed: '#2a5a30', rust: '#7a3018', rope: '#a08040',
    purple: '#7848a8',
};

// ── Prologue ──────────────────────────────────────────────────────────────────
let prologueScenes = [];
function buildPrologueScenes() {
    const n = playerData.name;
    prologueScenes = [
        { title: 'Stockholm — August 10, 1628', text: 'The most magnificent warship ever built has sunk. On her very first voyage. In front of the whole city. In under an hour.', bg: 'navy' },
        { title: 'The Arrest', text: 'Captain Söfring Hansson has been seized and thrown in prison. The king demands someone answer for this disaster. An execution may follow.', bg: 'wood' },
        { title: 'The Hidden Warning', text: 'You are ' + n + ' — apprentice of the late Master Henrik, the Vasa\'s original architect. He warned the king: two gun decks would make her dangerously top-heavy. The king refused to listen.', bg: 'gold' },
        { title: 'Your Mission', text: 'Master Henrik\'s notes survive. The witnesses are here. Gather three testimonies. Prove the Vasa was built wrong — not sailed wrong. Save an innocent man. Document the truth.', bg: 'blue' },
    ];
}

// ── Quiz Sets ─────────────────────────────────────────────────────────────────
// 8 questions per set; startBattle picks 5 at random each time
const quizSets = {
    quiz1: {
        name: 'Master Shipwright\'s Challenge',
        difficulty: { hpLossPerWrong: 35, passThreshold: 4 },
        questions: [
            { q: 'Who ordered the Vasa to be built?', options: ['King Gustav II Adolf','Queen Christina','King Karl X','King Erik XIV'], correct: 0, fact: 'Gustav II Adolf (1594–1632) was Sweden\'s warrior king. He wanted the Vasa to project Swedish naval power across the Baltic.' },
            { q: 'How many gun decks did the Vasa have?', options: ['One','Two','Three','Four'], correct: 1, fact: 'The second gun deck was added at the king\'s insistence, raising the center of gravity dangerously above the keel. This was the root cause of the sinking.' },
            { q: 'When did construction of the Vasa begin?', options: ['1620','1624','1626','1630'], correct: 2, fact: 'Work began in 1626 at the Skeppsgården shipyard in Stockholm, supervised by the Dutch shipwright Henrik Hybertszoon.' },
            { q: 'Approximately how many bronze cannons did the Vasa carry?', options: ['24','48','64','100'], correct: 2, fact: '64 bronze cannons, each weighing over 1,200 kg. The cannons alone were worth more than the ship itself.' },
            { q: 'What was the Vasa\'s primary purpose?', options: ['Trade ship','Fishing vessel','Passenger vessel','Warship'], correct: 3, fact: 'The Vasa was built to dominate the Baltic Sea and support Swedish military campaigns, especially against Poland.' },
            { q: 'What type of wood was primarily used to build the Vasa?', options: ['Pine','Oak','Spruce','Elm'], correct: 1, fact: 'Over 1,000 oak trees — each 150+ years old — were felled to build the Vasa. Oak was prized for its strength and resistance to rot.' },
            { q: 'Who was the original chief architect of the Vasa?', options: ['Hein Jacobsson','Lars Hansson','Henrik Hybertszoon','Gustav Eriksson'], correct: 2, fact: 'Henrik Hybertszoon, a Dutch shipwright, designed the Vasa. He died in 1627 before completion; his assistant Hein Jacobsson finished the work.' },
            { q: 'How many carved sculptures decorated the Vasa?', options: ['About 100','About 300','About 700','About 1,200'], correct: 2, fact: 'About 700 carved sculptures — lions, Roman emperors, sea monsters, mermaids — were originally painted vivid red, black, and gold.' },
        ]
    },
    quiz2: {
        name: 'The Admiral\'s Test',
        difficulty: { hpLossPerWrong: 35, passThreshold: 4 },
        questions: [
            { q: 'On what date did the Vasa sink?', options: ['July 4, 1628','August 10, 1628','September 15, 1628','October 1, 1628'], correct: 1, fact: 'August 10, 1628 — a Sunday. Crowds had gathered to watch, making the disaster shamefully public for the Swedish Crown.' },
            { q: 'Why did the Vasa sink?', options: ['Struck by lightning','Enemy attack','It was too top-heavy','Rotten wood'], correct: 2, fact: 'A stability test weeks earlier — 30 men running back and forth across the deck — showed catastrophic instability. The results were suppressed.' },
            { q: 'How far did the Vasa travel before sinking?', options: ['About 100 meters','About 1,300 meters','About 5 kilometers','It never left dock'], correct: 1, fact: 'Just 1,300 meters. She fired a salute, caught a gust of wind, heeled over, and sank in under an hour — all within sight of the dock.' },
            { q: 'What happened to the lower gun ports?', options: ['They were sealed shut','Water flooded in through them','They were above water','Sailors closed them in time'], correct: 1, fact: 'The lower gun ports were open for the salute. When the ship tilted, they dipped below the waterline and water flooded in instantly — sealing her fate.' },
            { q: 'How many people approximately died?', options: ['None','30 to 50','200 to 300','Over 500'], correct: 1, fact: 'Between 30 and 50 people drowned — crew and their families who had boarded for the celebratory voyage. Hundreds more swam to safety.' },
            { q: 'Who was Captain of the Vasa when she sank?', options: ['Karl Gyllenhielm','Söfring Hansson','Lars Eriksson','Per Larsson'], correct: 1, fact: 'Captain Söfring Hansson was arrested and blamed. An inquiry lasting months found no one guilty. The true fault lay with the king\'s design demands.' },
            { q: 'In what depth of water did the Vasa finally rest?', options: ['8 meters','16 meters','32 meters','50 meters'], correct: 2, fact: 'The Vasa settled in 32 meters of cold, dark, low-salinity Baltic water — the exact conditions that would preserve her for 333 years.' },
            { q: 'Who ultimately bore responsibility for the fatal design?', options: ['Captain Hansson','Admiral Gyllenhielm','King Gustav II Adolf','The Harbor Master'], correct: 2, fact: 'King Gustav II Adolf demanded two gun decks against his architect\'s advice. Delaying or defying the king was not an option anyone dared consider.' },
        ]
    },
    quiz3: {
        name: 'The King\'s Final Examination',
        difficulty: { hpLossPerWrong: 20, passThreshold: 3 },
        questions: [
            { q: 'Who discovered the Vasa wreck in 1956?', options: ['Jacques Cousteau','Alfred Nobel','Anders Franzen','Carl Linnaeus'], correct: 2, fact: 'Anders Franzen (1918–1993) spent years convinced the Vasa lay preserved in Stockholm harbor. A core sample of black oak from the seabed confirmed he was right.' },
            { q: 'In what year was the Vasa successfully raised?', options: ['1956','1961','1975','1988'], correct: 1, fact: 'On April 24, 1961, after 18 months of tunneling cables beneath the hull, the Vasa rose from 333 years of darkness — largely intact.' },
            { q: 'What percentage of the original wood survived?', options: ['About 40%','About 65%','About 95%','About 20%'], correct: 2, fact: 'About 95% survived underwater — an extraordinary figure. Cold, dark, low-oxygen, low-salinity Baltic water created near-perfect preservation conditions.' },
            { q: 'When did the Vasa Museum officially open?', options: ['1961','1975','1990','2000'], correct: 2, fact: 'The Vasa Museum on Djurgården island opened February 15, 1990. It now attracts over 1.5 million visitors per year.' },
            { q: 'How many artifacts were recovered from the seabed?', options: ['About 500','About 5,000','Over 36,000','About 100,000'], correct: 2, fact: 'Over 36,000 individual artifacts: shoes, tools, coins, rope, food, a backgammon set, and the personal belongings of the crew — all frozen in 1628.' },
            { q: 'What substance preserved the Vasa\'s wood?', options: ['Salt water solution','Polyethylene glycol','Formaldehyde','Beeswax'], correct: 1, fact: 'Polyethylene glycol (PEG) — a wax-like chemical — was sprayed on the Vasa for 17 years, replacing water in the wood cells and preventing collapse.' },
            { q: 'How long did the wood preservation take?', options: ['3 years','8 years','17 years','25 years'], correct: 2, fact: 'Seventeen years of continuous PEG spraying (1961–1979) before the ship was stable enough for public display.' },
            { q: 'What primarily saved the Vasa from decay?', options: ['Cold temperature','Low salinity — no shipworms','High water pressure','Complete darkness'], correct: 1, fact: 'The Baltic\'s low salinity means shipworms — the main destroyer of wooden wrecks worldwide — cannot survive there. This is why the Vasa survived when most wooden ships do not.' },
        ]
    }
};
// Shuffle answer options on load (answer order randomized, correct index updated)
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
}
Object.values(quizSets).forEach(set => {
    set.questions.forEach(q => {
        const correct = q.options[q.correct];
        for (let i = q.options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
        }
        q.correct = q.options.indexOf(correct);
    });
});

// ── Map Generation ────────────────────────────────────────────────────────────
// Tile key: 0=water, 1=water-light, 2=wood-plank, 3=stone, 4=wall, 5=wood-wall,
//           6=roof, 7=sand, 8=grass, 9=dock, 10=ship-hull, 11=path, 12=museum-floor,
//           13=museum-wall, 14=uw-sand, 15=uw-rock, 16=seaweed, 17=rope, 18=cannon

function generateShipyardMap() {
    const T = [
        [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
        [4,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4],
        [4,2,5,5,5,4,2,2,2,2,2,17,2,2,2,2,4,5,5,5,4,2,2,2,4],
        [4,2,5,2,5,4,2,2,2,2,2,17,2,2,2,2,4,2,2,2,4,2,2,2,4],
        [4,2,5,2,5,4,2,2,2,2,2,17,2,2,2,2,4,2,18,2,4,2,2,2,4],
        [4,2,4,4,4,4,2,2,17,17,17,17,17,17,2,2,4,4,11,4,4,2,2,2,4],
        [4,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4],
        [4,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4],
        [4,11,11,11,11,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4],
        [4,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4],
        [4,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4],
        [4,2,4,4,4,4,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,2,2,2,4],
        [4,2,4,2,2,4,2,2,2,2,2,2,2,2,2,2,4,2,2,2,4,2,2,2,4],
        [4,2,4,2,2,4,2,2,2,17,17,17,17,2,2,2,4,2,18,2,4,2,2,2,4],
        [4,2,4,4,11,4,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,2,2,2,4],
        [4,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4],
        [4,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,4],
        [4,4,4,4,11,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
    ];
    return T;
}

function generateHarborMap() {
    const T = [
        [7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7],
        [7,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,7],
        [7,9,4,4,4,4,9,9,9,9,9,9,9,9,9,9,4,4,4,4,4,9,9,9,7],
        [7,9,4,3,3,4,9,9,9,9,9,9,9,9,9,9,4,3,3,3,4,9,9,9,7],
        [7,9,4,3,11,4,9,9,9,9,9,9,9,9,9,9,4,3,11,3,4,9,9,9,7],
        [7,9,4,4,4,4,9,9,9,9,9,9,9,9,9,9,4,4,4,4,4,9,9,9,7],
        [7,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,7],
        [7,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,7],
        [7,11,11,11,11,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,7],
        [7,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,7],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [0,0,0,0,0,0,0,10,10,10,10,10,10,10,10,10,10,10,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,10,2,2,2,2,2,2,2,2,2,10,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,10,2,18,2,2,2,2,18,2,2,10,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,10,10,10,10,10,10,10,10,10,10,10,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ];
    return T;
}

function generateMuseumMap() {
    const T = [
        [13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13],
        [13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13],
        [13,12,13,13,13,13,12,12,12,12,12,12,12,12,12,12,13,13,13,13,13,12,12,12,13],
        [13,12,13,12,12,13,12,12,12,12,12,12,12,12,12,12,13,12,12,12,13,12,12,12,13],
        [13,12,13,12,12,13,12,12,12,12,12,12,12,12,12,12,13,12,12,12,13,12,12,12,13],
        [13,12,13,13,11,13,12,12,12,12,12,12,12,12,12,12,13,13,13,13,13,12,12,12,13],
        [13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13],
        [13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13],
        [13,11,11,11,11,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13],
        [13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13],
        [13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13],
        [13,12,13,13,13,13,12,12,12,12,12,12,12,12,12,12,13,13,13,13,13,12,12,12,13],
        [13,12,13,12,12,13,12,12,12,12,12,12,12,12,12,12,13,12,12,12,13,12,12,12,13],
        [13,12,13,12,12,13,12,12,12,12,12,12,12,12,12,12,13,12,12,12,13,12,12,12,13],
        [13,12,13,13,11,13,12,12,12,12,12,12,12,12,12,12,13,13,13,13,13,12,12,12,13],
        [13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13],
        [13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13],
        [13,13,13,13,11,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13],
    ];
    return T;
}

function generateArchiveMap() {
    const T = [
        [13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13],
        [13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13],
        [13,12,4,4,4,4,12,12,12,12,12,12,12,12,12,12,4,4,4,4,4,12,12,12,13],
        [13,12,4,2,2,4,12,12,12,12,12,12,12,12,12,12,4,2,2,2,4,12,12,12,13],
        [13,12,4,2,2,4,12,12,12,12,12,12,12,12,12,12,4,2,2,2,4,12,12,12,13],
        [13,12,4,4,4,4,12,12,12,12,12,12,12,12,12,12,4,4,4,4,4,12,12,12,13],
        [13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13],
        [13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13],
        [13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13],
        [13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13],
        [13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13],
        [13,12,4,4,4,4,12,12,12,12,12,12,12,12,12,12,4,4,4,4,4,12,12,12,13],
        [13,12,4,2,2,4,12,12,12,12,12,12,12,12,12,12,4,2,2,2,4,12,12,12,13],
        [13,12,4,2,2,4,12,12,12,12,12,12,12,12,12,12,4,2,2,2,4,12,12,12,13],
        [13,12,4,4,4,4,12,12,12,12,12,12,12,12,12,12,4,4,4,4,4,12,12,12,13],
        [13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13],
        [13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13],
        [13,13,13,13,11,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13],
    ];
    return T;
}

// ── Maps Object ───────────────────────────────────────────────────────────────
const maps = {
    shipyard: {
        name: 'Royal Shipyard — Stockholm, 1628',
        tiles: generateShipyardMap(),
        width: COLS, height: ROWS,
        warps: [{ x: 4, y: 17, target: 'harbor', toX: 4, toY: 9, requires: 'quiz1' }],
        npcs: [
            { id: 'bjorn', name: 'Bjorn the Sawyer', x: 7, y: 3, dir: 'down', isSpirit: false,
              colors: { body: '#4a2a10', skin: PAL.npcSkin, hair: '#806040', legs: '#3a2010', shoes: '#2a1808', satchel: false },
              dialogue: [
                  'Welcome to the Royal Shipyard, young Erik!',
                  'I have been cutting oak beams for the Vasa for two years.',
                  'Did you know we used timber from over 1,000 oak trees? It takes centuries to grow wood like this.',
                  'The king spared no expense. This ship must be Sweden\'s finest.'
              ]
            },
            { id: 'lars', name: 'Lars the Sculptor', x: 18, y: 4, dir: 'left', isSpirit: false,
              colors: { body: '#3a5030', skin: PAL.npcSkin, hair: '#404040', legs: '#2a3020', shoes: '#1a1a1a', satchel: false },
              dialogue: [
                  'Ah, you admire my work! I have carved over 700 sculptures for this magnificent ship.',
                  'Lions, Roman emperors, sea monsters, mermaids — all painted red, black, and gold.',
                  'When she sails past the fleet, every man will weep at her beauty.',
                  'A floating palace, some say. A floating palace of war.'
              ]
            },
            { id: 'ingrid', name: 'Ingrid the Sailmaker', x: 10, y: 12, dir: 'right', isSpirit: false,
              colors: { body: '#60408a', skin: PAL.npcSkin, hair: '#c07030', legs: '#40205a', shoes: '#2a1838', satchel: false },
              dialogue: [
                  'I have been sewing sails for six months. The main sail alone weighs hundreds of kilograms!',
                  'Between you and me, Erik — I have heard the shipwrights whispering.',
                  'They ran a stability test. Thirty men ran back and forth across the deck.',
                  'The ship rocked so violently the Admiral stopped the test. Yet she still sails tomorrow...'
              ]
            },
            { id: 'apprentice', name: 'Karl\'s Apprentice', x: 15, y: 8, dir: 'down', isSpirit: false,
              colors: { body: '#503020', skin: PAL.npcSkin, hair: '#604020', legs: '#2a1a10', shoes: '#1a1008', satchel: true },
              dialogue: [
                  'Psst — Erik! Have you heard about the gun decks?',
                  'The king originally ordered one gun deck. Then he changed his mind — he wanted TWO.',
                  'But Master Henrik warned the king: adding a second deck makes the ship too heavy at the top.',
                  'The king insisted. Master Henrik obeyed... and then died before the ship was finished.',
                  'His assistant Hein Jacobsson completed her. Nobody wants to tell the king he was wrong.'
              ]
            },
            { id: 'art_notebook', name: '★ Master Henrik\'s Notebook', x: 22, y: 3, dir: 'down', isArtifact: true, xpReward: 30,
              dialogue: ['★  MASTER HENRIK\'S NOTEBOOK', 'His stability calculations show the Vasa needed 120 tons of ballast to sail safely.', 'The king\'s redesign left space for only 42 tons.', 'This notebook was never presented to the court.', '+30 Scholar XP earned!']
            },
            { id: 'art_stability', name: '★ Stability Test Chalk Marks', x: 6, y: 15, dir: 'down', isArtifact: true, xpReward: 30,
              dialogue: ['★  STABILITY TEST CHALK MARKS', 'These marks record the day 30 men ran back and forth across the deck.', 'The ship rocked so violently Admiral Fleming stopped the test and left — without filing a report.', 'No one dared tell the king.', '+30 Scholar XP earned!']
            },
            { id: 'art_cannon_mold', name: '★ Bronze Cannon Mold', x: 22, y: 13, dir: 'down', isArtifact: true, xpReward: 25,
              dialogue: ['★  BRONZE CANNON MOLD', '64 bronze cannons were cast for the Vasa — each weighing over 1,200 kg.', 'The cannons alone were worth more than the ship itself.', 'Ironically, their weight on two decks was what doomed her.', '+25 Scholar XP earned!']
            },
            { id: 'boss_shipyard', name: 'Master Shipwright', x: 12, y: 8, dir: 'down', isBoss: true, quizKey: 'quiz1', isSpirit: false, requiresTalked: ['bjorn', 'lars', 'ingrid', 'apprentice'],
              colors: { body: '#1a3a6a', skin: PAL.npcSkin, hair: '#d0c080', legs: '#102050', shoes: '#0a1030', satchel: false },
              dialogue: [
                  'So you wish to document the Vasa, young Erik?',
                  'Then you must prove you have been paying attention.',
                  'I have built many ships in my years. The Vasa is the greatest — and perhaps the most dangerous.',
                  'Answer my questions correctly, and I will sign your logbook. Fail, and go back to sweeping sawdust.'
              ],
              battleIntro: 'Master Shipwright challenges your knowledge!'
            },
        ]
    },

    harbor: {
        name: 'Stockholm Harbor — August 10, 1628',
        tiles: generateHarborMap(),
        width: COLS, height: ROWS,
        warps: [{ x: 1, y: 8, target: 'shipyard', toX: 4, toY: 16 }],
        npcs: [
            { id: 'per', name: 'Per the Harbor Worker', x: 8, y: 6, dir: 'down', isSpirit: false,
              colors: { body: '#3a5a8a', skin: PAL.npcSkin, hair: '#8a6040', legs: '#1a3060', shoes: '#101828', satchel: false },
              dialogue: [
                  'I was right here when she sailed this morning. August 10th — I will never forget it.',
                  'The crowd cheered as the Vasa left the dock. She looked magnificent.',
                  'Then a breeze came from the south. She tilted. Just slightly at first.',
                  'Then the lower gun ports — open for the salute — water poured straight in.',
                  'Captain Hansson was screaming orders. He tried everything. The ship just... would not right herself.'
              ]
            },
            { id: 'maria', name: 'Maria', x: 20, y: 6, dir: 'left', isSpirit: false,
              colors: { body: '#8a3060', skin: PAL.npcSkin, hair: '#503020', legs: '#5a1040', shoes: '#3a0820', satchel: false },
              dialogue: [
                  'I brought my children to watch the great ship sail. It was supposed to be a celebration.',
                  'When she began to tilt, people on the shore laughed — they thought it was part of the show.',
                  'Then she went under. The screaming started.',
                  'Between thirty and fifty souls lost. On a calm day, in the harbor, in front of the whole city.',
                  'Captain Hansson did not deserve this blame. I watched with my own eyes — no captain could have saved that ship.'
              ]
            },
            { id: 'sailor_lars', name: 'Sailor Lars', x: 10, y: 7, dir: 'right', isSpirit: false,
              colors: { body: '#204060', skin: PAL.npcSkin, hair: '#404040', legs: '#102030', shoes: '#0a1018', satchel: false },
              dialogue: [
                  'I was on the lower gun deck when she heeled over. I barely got out.',
                  'The water came so fast. I swam up through the darkness.',
                  'You want to know the truth? Talk to the Dock Master. He knows where the wreck lies.',
                  'If you can get out there... the drowned sailors know what really happened.'
              ]
            },
            { id: 'dock_master', name: 'Dock Master Olof', x: 7, y: 9, dir: 'down', isSpirit: false,
              giveBoat: true,
              colors: { body: '#4a5a3a', skin: PAL.npcSkin, hair: '#808060', legs: '#2a3a1a', shoes: '#1a2010', satchel: true },
              dialogue: [
                  'Ahh, young Erik. Dark day for Stockholm.',
                  'You want to get out to the wreck? I have a rowboat tied at the south end.',
                  'Take it. Sail south to the water. Just keep clear of the hull — the current is bad around her.',
                  'And if you find any of our lost men out there... say a prayer for them.'
              ]
            },
            { id: 'art_cannon_ball', name: '★ Recovered Cannonball', x: 14, y: 6, dir: 'down', isArtifact: true, xpReward: 25,
              dialogue: ['★  RECOVERED CANNONBALL', 'This iron cannonball was found on the harbor floor near where the Vasa sank.', '53 of the 64 bronze cannons were salvaged from the wreck in the 1660s using a diving bell.', 'The remaining cannons still lie somewhere in the Baltic today.', '+25 Scholar XP earned!']
            },
            { id: 'art_harbor_log', name: '★ Harbor Master\'s Log', x: 22, y: 8, dir: 'down', isArtifact: true, xpReward: 30,
              dialogue: ['★  HARBOR MASTER\'S LOG', '"August 10, 1628 — The Vasa departed at approximately 3pm. Wind: light southerly."', '"She fired a salute. Heeled to port. Did not recover. Sank at 4pm."', '"Approximately 50 souls lost. The king has been notified."', '+30 Scholar XP earned!']
            },
            { id: 'boss_harbor', name: 'Admiral Karl Gyllenhielm', x: 12, y: 8, dir: 'down', isBoss: true, quizKey: 'quiz2', isSpirit: false, requiresTalked: ['per', 'maria', 'sailor_lars', 'dock_master'],
              colors: { body: '#0a2050', skin: PAL.npcSkin, hair: '#c8c0a0', legs: '#061030', shoes: '#040818', satchel: false },
              dialogue: [
                  'You are building a case for the captain, boy? I respect that.',
                  'I ordered the Vasa to sail. The king demanded it. The ship was not ready.',
                  'Master Henrik warned us — I heard him myself. The king threatened to have him arrested if he delayed again.',
                  'Before I give you my testimony, prove you understand what happened here.'
              ],
              battleIntro: 'Admiral Gyllenhielm demands you prove your understanding!'
            },
            { id: 'ghost_sailor', name: 'Ghost of a Drowned Sailor', x: 3, y: 14, dir: 'down', isSpirit: true,
              colors: { body: '#1a3a6a', skin: '#c8d8e8', hair: '#d8d0a8', legs: '#102050', shoes: '#0a1030', satchel: false },
              dialogue: [
                  'The water... so cold...',
                  'I was loading the lower cannons when she heeled over.',
                  'The gun ports were OPEN for the salute. Water poured through instantly.',
                  'I swear to you: Captain Hansson tried to close them. But it happened too fast for any man to stop.',
                  'The ship was wrong from the keel up. That is your testimony. Write it down, Erik.'
              ]
            },
            { id: 'diver', name: 'Harbor Diver', x: 21, y: 12, dir: 'left', isSpirit: false,
              colors: { body: '#2a5a4a', skin: PAL.npcSkin, hair: '#604020', legs: '#1a3a2a', shoes: '#0a2010', satchel: false },
              dialogue: [
                  'Whoa! Careful out here in a rowboat.',
                  'I have been diving on the wreck — salvaging bronze cannons. Worth a fortune.',
                  'Want to know something strange? The gun ports on the lower deck — they were still open when I dove down.',
                  'Those ports are far too low for a ship carrying that much weight up top. Any shipwright would know it.',
                  'Your Captain Hansson did not design those ports. Take that to the court.'
              ]
            },
        ]
    },

    museum: {
        name: 'Vasa Museum — Stockholm, 1990',
        tiles: generateMuseumMap(),
        width: COLS, height: ROWS,
        warps: [{ x: 1, y: 8, target: 'harbor', toX: 4, toY: 9 },
                { x: 4, y: 17, target: 'archive', toX: 12, toY: 9, requires: 'quiz3' }],
        npcs: [
            { id: 'guide_sofia', name: 'Tour Guide Sofia', x: 8, y: 6, dir: 'down', isSpirit: false,
              colors: { body: '#d0c0a0', skin: PAL.npcSkin, hair: '#804020', legs: '#a0907a', shoes: '#605040', satchel: true },
              dialogue: [
                  'Welcome to the Vasa Museum! You are standing 333 years after the ship sank.',
                  'The Vasa lay on the harbor floor, forgotten, until 1956.',
                  'A man named Anders Franzen spent years searching for it. He used a simple tool: a core sampler lowered from a rowboat.',
                  'One day it came up with a piece of black oak. He had found the Vasa.',
                  'On April 24, 1961, the Vasa rose from the water — almost perfectly intact. 95 percent of the original wood survived.'
              ]
            },
            { id: 'archaeologist', name: 'Dr. Anna Lindgren', x: 17, y: 4, dir: 'left', isSpirit: false,
              colors: { body: '#506a40', skin: PAL.npcSkin, hair: '#c09060', legs: '#304028', shoes: '#202818', satchel: true },
              dialogue: [
                  'The cold, dark Baltic Sea saved the Vasa. Low salinity means no shipworms. Low oxygen means slow decay.',
                  'We found over 36,000 artifacts on the seabed: shoes, tools, coins, clothes, even a backgammon set.',
                  'Preserving the wood took 17 years of spraying with polyethylene glycol — a wax-like substance.',
                  'It replaced the water in the wood cells and hardened them. Without it, the wood would have crumbled to dust.'
              ]
            },
            { id: 'young_visitor', name: 'Young Student', x: 10, y: 10, dir: 'right', isSpirit: false,
              colors: { body: '#d04020', skin: PAL.npcSkin, hair: '#404040', legs: '#203050', shoes: '#101820', satchel: false },
              dialogue: [
                  'This is my third time visiting! Did you know the Vasa has over 700 carved sculptures?',
                  'They were originally painted in bright colors — red, blue, gold, black. Imagine that!',
                  'My favorite fact: the ship was in the water for only 20 minutes before it sank.',
                  'And yet it\'s now one of the most visited museums in the world. Pretty crazy, right?'
              ]
            },
            { id: 'art_vasa_model', name: '★ Vasa Scale Model', x: 18, y: 10, dir: 'down', isArtifact: true, xpReward: 25,
              dialogue: ['★  VASA SCALE MODEL  (1:10)', 'This model shows the Vasa as she looked in 1628: vivid red, gold, and black.', 'All 700 sculptures were originally painted in brilliant colors.', 'None of that color survived 333 years at the bottom of the sea.', '+25 Scholar XP earned!']
            },
            { id: 'art_shoe', name: '★ A Sailor\'s Boot', x: 14, y: 3, dir: 'down', isArtifact: true, xpReward: 25,
              dialogue: ['★  A SAILOR\'S BOOT', 'This boot was found on the seabed next to the wreck.', 'Over 700 personal items of clothing were recovered — many still holding the shape of the person who wore them.', 'They were frozen in time on August 10, 1628.', '+25 Scholar XP earned!']
            },
            { id: 'ghost_king', name: 'Ghost of King Gustav II Adolf', x: 12, y: 8, dir: 'down', isBoss: true, quizKey: 'quiz3', isSpirit: true, requiresTalked: ['guide_sofia', 'archaeologist', 'young_visitor'],
              colors: { body: '#304870', skin: '#c8d8e8', hair: '#d8d0a8', legs: '#1a2840', shoes: '#101828', satchel: false },
              dialogue: [
                  '...',
                  'So... you have come to document my great ship\'s failure.',
                  'I ordered the Vasa built. I demanded two gun decks. I insisted she sail before she was ready.',
                  'Three hundred years I have watched visitors walk beneath her hull. They understand now.',
                  'Do YOU understand? Prove it. Answer my questions, young scholar.'
              ],
              battleIntro: 'The Ghost of King Gustav II Adolf appears!'
            },
        ]
    },

    archive: {
        name: 'Vasa Archive & Library',
        tiles: generateArchiveMap(),
        width: COLS, height: ROWS,
        warps: [{ x: 4, y: 17, target: 'museum', toX: 4, toY: 16 }],
        npcs: [
            { id: 'art_inquiry', name: '★ Royal Inquiry Transcript', x: 8, y: 5, dir: 'down', isArtifact: true, xpReward: 50,
              dialogue: ['★  THE 1628 ROYAL INQUIRY', '"Stockholm, November 1628 — By order of His Majesty..."', 'The inquiry questioned the captain, officers, pilots, and builders.', 'Conclusion: "God\'s will and the weakness of the ship." No one convicted.', 'The truth was buried in politics for 333 years. Until now.', '+50 Scholar XP earned!']
            },
            { id: 'archivist', name: 'Head Archivist', x: 12, y: 8, dir: 'down', isSpirit: false,
              colors: { body: '#5a4530', skin: PAL.npcSkin, hair: '#d0c8a8', legs: '#3a2a18', shoes: '#201808', satchel: true },
              triggersEnding: true,
              earlyDialogue: [
                  'You have not yet gathered all three testimonies.',
                  'Return when the Shipwright, the Admiral, and the King have all spoken.',
                  'The captain\'s fate depends on all three.'
              ],
              dialogue: [
                  'Young Erik. I have read your testimonies. Every one of them.',
                  'The Shipwright\'s logbook. The Admiral\'s sworn statement. The King\'s own admission.',
                  'This is more than enough.',
                  'I am reopening the Royal Inquiry. Captain Söfring Hansson will be freed.',
                  'You have done something remarkable, Erik. You used truth as a weapon.',
                  'The Vasa was doomed by pride and politics — not by any sailor.',
                  'Every great disaster in history gets covered up. Most stay covered.',
                  'This one will not. Not because of the ship — but because of you.',
                  'Your logbook is now part of the official record. This is your diploma.'
              ]
            },
        ]
    }
};

// ── Further Reading ───────────────────────────────────────────────────────────
const furtherReading = [
    'Fred Hocker, "Vasa: A Swedish Warship" (2011)',
    'Lars-Ake Kvarning, "The Warship Vasa" (2011)',
    'Anders Franzen, "The Warship Vasa: Deep Diving and Marine Archaeology" (1960)',
    'Vasa Museum Official Guide — vasamuseet.se',
    'Carl Olof Cederlund, "Vasa I: The Archaeology of a Swedish Warship of 1628" (2006)',
    'Swedish National Maritime Museum Archives — historia.maritima.se',
];

// ── Slideshow Slides ──────────────────────────────────────────────────────────
const slideshowSlides = [
    { bg1: '#0a0f1a', bg2: '#0a2040', accent: '#FECC02',
      title: 'THE VASA', sub: 'Pride of Sweden, 1628',
      lines: ['Built on the orders of King Gustav II Adolf,', 'the Vasa was Sweden\'s most powerful warship.', '', 'She carried 64 bronze cannons on two decks', 'and 700 carved sculptures painted in', 'brilliant red, black, and gold.'],
      icon: 'ship' },
    { bg1: '#1a0a0a', bg2: '#2a1008', accent: '#d04040',
      title: 'THE SINKING', sub: 'August 10, 1628',
      lines: ['On her maiden voyage, a gust of wind', 'heeled the Vasa over. Water flooded', 'through the open lower gun ports.', '', 'She sank in 32 meters of water,', 'just 1,300 meters from the dock.'],
      icon: 'wave' },
    { bg1: '#0a1a0a', bg2: '#0a2a10', accent: '#50c850',
      title: 'PRESERVED IN ICE', sub: 'Cold Baltic Sea — 333 years',
      lines: ['The cold, dark Baltic saved the Vasa.', 'Low salinity: no shipworms.', 'Low oxygen: almost no decay.', '', '95 percent of the original wood survived', 'the 333 years on the seabed.'],
      icon: 'anchor' },
    { bg1: '#0a0a1a', bg2: '#0a102a', accent: '#5090d8',
      title: 'THE DISCOVERY', sub: 'Anders Franzen, 1956',
      lines: ['Marine archaeologist Anders Franzen', 'spent years searching the harbor.', '', 'A simple core sampler lowered from', 'a rowboat brought up a piece of', 'black oak. He had found the Vasa.'],
      icon: 'star' },
    { bg1: '#1a1008', bg2: '#2a1a10', accent: '#d4a800',
      title: 'THE RAISING', sub: 'April 24, 1961',
      lines: ['After 18 months of preparation,', 'the Vasa was carefully raised.', '', 'She emerged from the water almost', 'perfectly intact — a 333-year-old', 'time capsule from 1628.'],
      icon: 'crown' },
    { bg1: '#0a1018', bg2: '#0a1828', accent: '#80c8ff',
      title: 'VASA MUSEUM', sub: 'Stockholm — opened 1990',
      lines: ['The Vasa Museum on Djurgarden island', 'opened February 15, 1990.', '', 'Over 35 million visitors have come', 'to see the world\'s only preserved', '17th-century warship.'],
      icon: 'globe' },
];

// ── Particle System ───────────────────────────────────────────────────────────
function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({ x, y, vx: (Math.random()-0.5)*4, vy: (Math.random()-2.5)*3, color, life: 1, size: Math.random()*4+2 });
    }
}
function updateParticles() { particles = particles.filter(p => { p.x+=p.vx; p.y+=p.vy; p.vy+=0.1; p.life-=0.02; return p.life>0; }); }
function drawParticles() { particles.forEach(p => { ctx.fillStyle=`rgba(${hexToRgb(p.color)},${p.life})`; ctx.fillRect(p.x, p.y, p.size, p.size); }); }
function hexToRgb(hex) { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `${r},${g},${b}`; }

// ── Tile Drawing ──────────────────────────────────────────────────────────────
function drawTile(tx, ty, tile, mapName) {
    const x = tx * TILE, y = ty * TILE;
    const animate = (frameCount + tx * 3 + ty * 7) % 60;
    switch(tile) {
        case 0: { // deep water — Pokémon style
            const wv0 = (frameCount + tx * 5 + ty * 3) % 90;
            ctx.fillStyle = wv0 < 45 ? '#0a3060' : '#0c3870';
            ctx.fillRect(x, y, TILE, TILE);
            // Drifting shimmer bands
            if ((tx + ty * 3 + Math.floor(frameCount / 18)) % 5 === 0) {
                ctx.fillStyle = 'rgba(80,160,240,0.22)';
                ctx.fillRect(x + 3, y + 9, 20, 4);
            }
            if ((tx * 2 + ty + Math.floor(frameCount / 24)) % 7 === 0) {
                ctx.fillStyle = 'rgba(100,180,255,0.18)';
                ctx.fillRect(x + 14, y + 20, 14, 3);
            }
            // Sparkle cross — appears briefly on individual tiles
            const sparkPhase = (tx * 17 + ty * 31 + Math.floor(frameCount / 6)) % 180;
            if (sparkPhase < 4) {
                const sa = (4 - sparkPhase) / 4;
                ctx.fillStyle = `rgba(255,255,255,${sa * 0.85})`;
                ctx.fillRect(x + 13, y + 12, 5, 1);
                ctx.fillRect(x + 15, y + 10, 1, 5);
            }
            break;
        }
        case 1: { // shallow water — lighter, more active
            const wv1 = (frameCount + tx * 4 + ty * 6) % 60;
            ctx.fillStyle = wv1 < 30 ? '#1a5090' : '#2060a8';
            ctx.fillRect(x, y, TILE, TILE);
            // Wave lines scrolling
            if ((tx + ty + Math.floor(frameCount / 10)) % 3 === 0) {
                ctx.fillStyle = 'rgba(150,200,255,0.28)';
                ctx.fillRect(x + 2, y + 6, 24, 4);
            }
            if ((tx + ty + Math.floor(frameCount / 15) + 2) % 3 === 0) {
                ctx.fillStyle = 'rgba(150,200,255,0.22)';
                ctx.fillRect(x + 4, y + 18, 20, 3);
            }
            // Foam sparkle
            const fPhase = (tx * 13 + ty * 19 + Math.floor(frameCount / 8)) % 120;
            if (fPhase < 6) {
                const fa = (6 - fPhase) / 6;
                ctx.fillStyle = `rgba(255,255,255,${fa * 0.65})`;
                ctx.fillRect(x + 7, y + 7, 4, 4);
                ctx.fillRect(x + 19, y + 19, 4, 4);
            }
            break;
        }
        case 2: // wood plank
            ctx.fillStyle = PAL.wood;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = PAL.woodDark;
            ctx.fillRect(x, y+TILE-3, TILE, 2);
            ctx.fillRect(x, y, 2, TILE);
            ctx.fillStyle = PAL.woodLight;
            ctx.fillRect(x+4, y+4, TILE-8, 4);
            break;
        case 3: // stone cobble
            ctx.fillStyle = PAL.stone;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = PAL.stoneLight;
            ctx.fillRect(x+2, y+2, 12, 10);
            ctx.fillRect(x+18, y+14, 10, 8);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(x, y+TILE-2, TILE, 2);
            ctx.fillRect(x+TILE-2, y, 2, TILE);
            break;
        case 4: // stone wall
            ctx.fillStyle = '#4a4038';
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = '#5a5048';
            ctx.fillRect(x+2, y+2, TILE-4, 10);
            ctx.fillRect(x+2, y+18, TILE-4, 8);
            ctx.fillStyle = '#3a3028';
            ctx.fillRect(x, y+TILE-2, TILE, 2);
            break;
        case 5: // wood wall
            ctx.fillStyle = PAL.woodDark;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = PAL.wood;
            ctx.fillRect(x+2, y, 5, TILE);
            ctx.fillRect(x+14, y, 5, TILE);
            ctx.fillRect(x+26, y, 4, TILE);
            break;
        case 6: // roof
            ctx.fillStyle = '#2a1a10';
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = '#3a2818';
            ctx.fillRect(x+2, y+2, TILE-4, TILE-4);
            break;
        case 7: // sand
            ctx.fillStyle = PAL.sand;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = '#b8a880';
            if ((tx+ty)%3===0) ctx.fillRect(x+8, y+12, 8, 3);
            break;
        case 8: // grass
            ctx.fillStyle = PAL.grass;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = PAL.grassLight;
            if ((tx*3+ty)%4===0) ctx.fillRect(x+4, y+4, 6, 6);
            break;
        case 9: // dock boards
            ctx.fillStyle = PAL.dock;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = PAL.dockLight;
            ctx.fillRect(x+2, y+2, TILE-4, 6);
            ctx.fillRect(x+2, y+18, TILE-4, 6);
            ctx.fillStyle = PAL.woodDark;
            ctx.fillRect(x, y+TILE-2, TILE, 2);
            break;
        case 10: // ship hull
            ctx.fillStyle = '#4a2010';
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = '#6a3018';
            ctx.fillRect(x+2, y+4, TILE-4, 8);
            ctx.fillStyle = PAL.gold;
            ctx.fillRect(x+2, y+14, TILE-4, 3);
            ctx.fillRect(x+2, y+2, TILE-4, 2);
            break;
        case 11: // path
            ctx.fillStyle = '#9a8868';
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = '#8a7858';
            if ((tx+ty)%2===0) ctx.fillRect(x+4, y+4, TILE-8, TILE-8);
            break;
        case 12: // museum floor
            ctx.fillStyle = PAL.museum;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = '#c8c0b0';
            ctx.fillRect(x, y, TILE, 2);
            ctx.fillRect(x, y, 2, TILE);
            if ((tx+ty)%2===0) { ctx.fillStyle='#d8d0c0'; ctx.fillRect(x+4, y+4, TILE-8, TILE-8); }
            break;
        case 13: // museum wall
            ctx.fillStyle = PAL.museumWall;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = '#c8c0b0';
            ctx.fillRect(x+2, y+4, TILE-4, 8);
            ctx.fillRect(x+2, y+20, TILE-4, 6);
            break;
        case 17: // rope coil
            ctx.fillStyle = PAL.wood;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = PAL.rope;
            ctx.beginPath(); ctx.arc(x+16, y+16, 10, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = PAL.wood;
            ctx.beginPath(); ctx.arc(x+16, y+16, 6, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = PAL.rope;
            ctx.beginPath(); ctx.arc(x+16, y+16, 3, 0, Math.PI*2); ctx.fill();
            break;
        case 18: // cannon
            ctx.fillStyle = PAL.wood;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = PAL.cannon;
            ctx.fillRect(x+6, y+12, 20, 8);
            ctx.fillRect(x+8, y+8, 16, 4);
            ctx.fillRect(x+24, y+14, 4, 4);
            ctx.fillStyle = '#303030';
            ctx.fillRect(x+6, y+10, 2, 12);
            break;
        default:
            ctx.fillStyle = PAL.bg;
            ctx.fillRect(x, y, TILE, TILE);
    }
}

// ── Sprite Drawing ─────────────────────────────────────────────────────────────
function drawPixelChar(x, y, dir, isNpc, colors, bobOffset=0, isMoving=false) {
    const px = Math.floor(x), py = Math.floor(y);
    const bob = isMoving ? Math.sin(frameCount * 0.3) * 2 : 0;
    const bob2 = isMoving ? Math.sin(frameCount * 0.3 + Math.PI) * 2 : 0;
    ctx.save(); ctx.translate(px + 16, py + 16 + bobOffset);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-10, 12, 20, 5);

    // Legs
    if (dir === 'down' || dir === 'up') {
        ctx.fillStyle = colors.legs;
        ctx.fillRect(-6, 4, 5, 10+bob); ctx.fillRect(1, 4, 5, 10+bob2);
    } else {
        ctx.fillStyle = colors.legs;
        ctx.fillRect(-6, 4, 11, 10);
    }
    // Shoes
    ctx.fillStyle = colors.shoes || '#202020';
    if (dir !== 'up') { ctx.fillRect(-7, 12+bob, 6, 4); ctx.fillRect(1, 12+bob2, 6, 4); }
    else { ctx.fillRect(-6, 12, 11, 4); }

    // Body
    ctx.fillStyle = colors.body;
    ctx.fillRect(-8, -10, 16, 15);
    // Chest detail
    ctx.fillStyle = colors.shoes || '#202020';
    ctx.fillRect(-2, -8, 4, 8);

    // Arms
    ctx.fillStyle = colors.body;
    if (dir === 'left') { ctx.fillRect(-10, -8, 4, 10+bob); }
    else if (dir === 'right') { ctx.fillRect(6, -8, 4, 10+bob2); }
    else { ctx.fillRect(-12, -8, 4, 10+bob); ctx.fillRect(8, -8, 4, 10+bob2); }

    // Head
    ctx.fillStyle = colors.skin;
    ctx.fillRect(-6, -20, 12, 12);

    // Eyes
    ctx.fillStyle = '#1a1008';
    if (dir === 'down') { ctx.fillRect(-4, -16, 3, 3); ctx.fillRect(1, -16, 3, 3); }
    else if (dir === 'right') { ctx.fillRect(2, -16, 3, 3); }
    else if (dir === 'left') { ctx.fillRect(-5, -16, 3, 3); }

    // Hair
    ctx.fillStyle = colors.hair || '#404040';
    ctx.fillRect(-6, -22, 12, 5);
    if (dir !== 'up') { ctx.fillRect(-8, -20, 3, 8); ctx.fillRect(6, -20, 3, 8); }

    // Spirit glow
    if (colors.isSpirit) {
        ctx.fillStyle = `rgba(100,180,255,${Math.sin(frameCount*0.05)*0.2+0.2})`;
        ctx.fillRect(-10, -24, 20, 38);
    }

    // Satchel
    if (colors.satchel) {
        ctx.fillStyle = PAL.wood;
        ctx.fillRect(8, -4, 8, 10);
        ctx.fillStyle = PAL.rope;
        ctx.fillRect(8, -8, 2, 6);
    }

    ctx.restore();
}

// ── Artifact Sprite ────────────────────────────────────────────────────────────
function drawArtifactSprite(x, y, collected) {
    if (collected) {
        // Faded outline only
        ctx.strokeStyle = 'rgba(160,140,60,0.4)'; ctx.lineWidth=1;
        ctx.strokeRect(x+8, y+6, 16, 20);
        return;
    }
    // Glowing scroll/chest
    ctx.fillStyle = PAL.parchment;
    ctx.fillRect(x+8, y+6, 16, 20);
    ctx.fillStyle = PAL.rope; // brown binding
    ctx.fillRect(x+8, y+6, 16, 4);
    ctx.fillRect(x+8, y+22, 16, 4);
    ctx.fillRect(x+14, y+6, 4, 20);
    // Star on scroll
    ctx.fillStyle = PAL.gold;
    ctx.fillRect(x+13, y+12, 6, 2);
    ctx.fillRect(x+15, y+10, 2, 6);
}

// ── HUD ────────────────────────────────────────────────────────────────────────
function drawHUD(mapName) {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, 800, 36);
    ctx.fillStyle = PAL.swYellow;
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText(mapName, 10, 24);

    // Artifact count
    const allArtifacts = Object.values(maps).flatMap(m => m.npcs).filter(n => n.isArtifact);
    const foundArt = allArtifacts.filter(n => playerData.talkedToNpcs.includes(n.id)).length;
    ctx.fillStyle = foundArt === allArtifacts.length ? PAL.gold : '#a09040';
    ctx.textAlign = 'left';
    ctx.fillText(`★ ${foundArt}/${allArtifacts.length}`, 310, 24);

    ctx.fillStyle = '#a0b0d0';
    ctx.textAlign = 'right';
    ctx.fillText(`LV ${playerData.level}  ${playerData.xp} XP`, 790, 24);

    ctx.fillStyle = PAL.hpGreen;
    ctx.textAlign = 'center';
    ctx.fillText(`${playerData.correctAnswers}/${playerData.questionsAnswered} correct`, 400, 24);
    ctx.fillStyle = '#5060a0'; ctx.font='7px "Press Start 2P"';
    ctx.fillText('[C] CODEX', 400, 34);
    ctx.textAlign = 'left';

    // Quest tracker
    const bY = 46;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(580, bY, 210, 62);
    ctx.strokeStyle = PAL.textBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(580, bY, 210, 62);
    ctx.fillStyle = '#8090b8';
    ctx.font = '7px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText('TESTIMONIES', 590, bY+14);
    const b = playerData.defeatedBosses;
    ctx.fillStyle = b.includes('quiz1') ? PAL.hpGreen : '#506080';
    ctx.fillText(b.includes('quiz1') ? '[+] Shipyard' : '[ ] Shipyard', 590, bY+28);
    ctx.fillStyle = b.includes('quiz2') ? PAL.hpGreen : '#506080';
    ctx.fillText(b.includes('quiz2') ? '[+] Harbor' : '[ ] Harbor', 590, bY+42);
    ctx.fillStyle = b.includes('quiz3') ? PAL.hpGreen : '#506080';
    ctx.fillText(b.includes('quiz3') ? '[+] Museum' : '[ ] Museum', 590, bY+56);
}

// ── Overworld Update ──────────────────────────────────────────────────────────
function updateOverworld() {
    const map = maps[playerData.currentMap];

    if (playerData.moving) {
        playerData.moveProgress += 0.15;
        if (playerData.moveProgress >= 1) {
            playerData.x = playerData.targetX;
            playerData.y = playerData.targetY;
            playerData.moving = false;
            playerData.moveProgress = 0;

            // Check warps
            for (const warp of (map.warps || [])) {
                if (playerData.x === warp.x && playerData.y === warp.y) {
                    if (warp.requires && !playerData.defeatedBosses.includes(warp.requires)) {
                        startDialogue([`You need to complete the ${warp.requires === 'quiz1' ? 'Shipyard' : warp.requires === 'quiz2' ? 'Harbor' : 'Museum'} challenge first!`], null);
                        return;
                    }
                    startMapTransition(warp.target, warp.toX, warp.toY);
                    return;
                }
            }
        }
        return;
    }

    let dx = 0, dy = 0;
    if (keys['ArrowUp'] || keys['w']) dy = -1;
    else if (keys['ArrowDown'] || keys['s']) dy = 1;
    else if (keys['ArrowLeft'] || keys['a']) dx = -1;
    else if (keys['ArrowRight'] || keys['d']) dx = 1;

    if (dx !== 0) playerData.dir = dx > 0 ? 'right' : 'left';
    if (dy !== 0) playerData.dir = dy > 0 ? 'down' : 'up';

    if (dx !== 0 || dy !== 0) {
        const nx = playerData.x + dx, ny = playerData.y + dy;
        if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
            const tile = map.tiles[ny][nx];
            const blocked = [4, 5, 6, 10, 13];
            // Water only walkable in harbor with a boat
            if (playerData.currentMap === 'harbor' && !playerData.hasBoat) {
                blocked.push(0, 1);
            }
            if (!blocked.includes(tile)) {
                // Check NPC collision
                const npc = map.npcs.find(n => n.x === nx && n.y === ny);
                if (!npc) {
                    playerData.targetX = Math.max(0, Math.min(map.width - 1, nx));
                    playerData.targetY = Math.max(0, Math.min(map.height - 1, ny));
                    playerData.moving = true;
                }
            }
        }
    }

    // Codex
    if (keyJustPressed('c') || keyJustPressed('C')) {
        codexOpen = true; codexPage = 0; gameState = 'codex';
        return;
    }

    // Interact
    if (keyJustPressed(' ') || keyJustPressed('Enter') || keyJustPressed('z')) {
        const facingX = playerData.x + (playerData.dir==='right'?1:playerData.dir==='left'?-1:0);
        const facingY = playerData.y + (playerData.dir==='down'?1:playerData.dir==='up'?-1:0);
        const npc = map.npcs.find(n => n.x===facingX && n.y===facingY);
        if (npc) {
            if (npc.isArtifact) {
                const collected = playerData.talkedToNpcs.includes(npc.id);
                if (!collected) {
                    startDialogue(npc.dialogue, () => {
                        playerData.talkedToNpcs.push(npc.id);
                        playerData.xp += (npc.xpReward || 25);
                        spawnParticles(playerData.x*TILE+16, playerData.y*TILE, PAL.gold, 12);
                    });
                } else {
                    startDialogue(['You have already examined this artifact.'], null);
                }
            } else if (npc.isBoss && !playerData.defeatedBosses.includes(npc.quizKey)) {
                // Check if all required NPCs have been talked to
                const required = npc.requiresTalked || [];
                const missing = required.filter(id => !playerData.talkedToNpcs.includes(id));
                if (missing.length > 0) {
                    // Build a thematic hint based on which boss this is
                    let hint;
                    const map = maps[playerData.currentMap];
                    const missingNames = missing.map(id => {
                        const n = map.npcs.find(nn => nn.id === id);
                        return n ? n.name : id;
                    });
                    if (npc.quizKey === 'quiz1') {
                        hint = `Before we settle this with knowledge, seek out the workers who built her. Have you spoken with ${missingNames.join(' and ')}? ${missing.length === 1 ? 'One worker still has words for you.' : missing.length + ' workers still have words for you.'} Hear them out first.`;
                    } else if (npc.quizKey === 'quiz2') {
                        hint = `You are not ready yet, young scholar. ${missing.length === 1 ? 'There is still a witness you have not spoken to' : 'There are still ' + missing.length + ' witnesses you have not spoken to'}: ${missingNames.join(' and ')}. A thorough inquiry leaves no witness unheard.`;
                    } else {
                        hint = `...You have not yet learned everything this museum holds. ${missing.length === 1 ? 'One voice still waits to speak to you' : missing.length + ' voices still wait to speak to you'}: ${missingNames.join(' and ')}. Return when you have listened to them all.`;
                    }
                    startDialogue([hint], null);
                } else {
                    startDialogue(npc.dialogue, () => startBattle(npc));
                }
            } else if (npc.isBoss) {
                startDialogue(['You have already proven your knowledge here. Well done, scholar!'], null);
            } else {
                const alreadyTalked = playerData.talkedToNpcs.includes(npc.id);
                // Archivist / triggersEnding NPCs: show full dialogue any time player has all bosses
                let dlgLines;
                if (npc.triggersEnding) {
                    dlgLines = playerData.defeatedBosses.length >= 3 ? npc.dialogue : (npc.earlyDialogue || npc.dialogue);
                } else if (npc.giveBoat && playerData.hasBoat) {
                    dlgLines = ['Your rowboat is tied right here. Safe sailing, Erik.'];
                } else {
                    dlgLines = alreadyTalked ? [npc.dialogue[0]] : npc.dialogue;
                }
                startDialogue(dlgLines, () => {
                    if (!alreadyTalked) {
                        playerData.talkedToNpcs.push(npc.id);
                        if (!playerData.hasLogbook) playerData.hasLogbook = true;
                        if (npc.giveBoat && !playerData.hasBoat) {
                            playerData.hasBoat = true;
                            startDialogue(['You received the ROWBOAT! Sail south onto the harbor water to explore the wreck site.'], null);
                        }
                    }
                    // Always check ending trigger regardless of visit history
                    if (npc.triggersEnding && playerData.defeatedBosses.length >= 3) {
                        gameState = 'diploma'; diplomaTimer = 0; diplomaPhase = 0;
                    }
                });
            }
        }
    }
}

// ── Overworld Draw ─────────────────────────────────────────────────────────────
function drawOverworld() {
    const map = maps[playerData.currentMap];
    const interpX = playerData.x + (playerData.targetX - playerData.x) * playerData.moveProgress;
    const interpY = playerData.y + (playerData.targetY - playerData.y) * playerData.moveProgress;
    const camX = Math.max(0, Math.min(map.width*TILE-800, interpX*TILE-400+TILE/2));
    const camY = Math.max(0, Math.min(map.height*TILE-600, interpY*TILE-300+TILE/2));

    ctx.save();
    if (screenShake > 0) {
        ctx.translate(Math.random()*screenShake-screenShake/2, Math.random()*screenShake-screenShake/2);
        screenShake *= 0.9; if (screenShake < 0.5) screenShake = 0;
    }
    ctx.translate(-camX, -camY);

    const sc = Math.floor(camX/TILE), ec = Math.min(map.width, sc+27);
    const sr = Math.floor(camY/TILE), er = Math.min(map.height, sr+21);
    for (let y=sr; y<er; y++) for (let x=sc; x<ec; x++) drawTile(x, y, map.tiles[y][x], playerData.currentMap);

    // NPCs + Artifacts
    const fx = playerData.x+(playerData.dir==='right'?1:playerData.dir==='left'?-1:0);
    const fy = playerData.y+(playerData.dir==='down'?1:playerData.dir==='up'?-1:0);
    map.npcs.forEach(npc => {
        const pulse = Math.sin(frameCount*0.06+npc.x)*0.3+0.7;
        if (npc.isArtifact) {
            const collected = playerData.talkedToNpcs.includes(npc.id);
            if (!collected) {
                // Pulsing gold aura
                ctx.fillStyle = `rgba(212,168,0,${pulse*0.35})`;
                ctx.fillRect(npc.x*TILE-5, npc.y*TILE-5, TILE+10, TILE+10);
            }
            drawArtifactSprite(npc.x*TILE, npc.y*TILE, collected);
        } else {
            if (npc.isBoss && !playerData.defeatedBosses.includes(npc.quizKey)) {
                ctx.fillStyle = `rgba(255,80,80,${pulse*0.4})`;
                ctx.beginPath(); ctx.arc(npc.x*TILE+16, npc.y*TILE+8, 14, 0, Math.PI*2); ctx.fill();
            }
            const colors = { ...npc.colors, isSpirit: npc.isSpirit };
            drawPixelChar(npc.x*TILE, npc.y*TILE, npc.dir, true, colors);
        }
        // Interaction indicator (works for both NPCs and artifacts)
        if (npc.x===fx && npc.y===fy && Math.floor(frameCount/20)%2===0) {
            ctx.fillStyle = npc.isArtifact ? PAL.gold : PAL.swYellow;
            ctx.fillRect(npc.x*TILE+12, npc.y*TILE-18, 8, 2);
            ctx.fillRect(npc.x*TILE+14, npc.y*TILE-16, 4, 4);
        }
    });

    // Boat hull — rendered before player so player sits on top
    const curTile = map.tiles[Math.round(playerData.y)]?.[Math.round(playerData.x)] ?? 0;
    const onWater = playerData.hasBoat && playerData.currentMap === 'harbor' && (curTile === 0 || curTile === 1);
    if (onWater) {
        const bx = interpX*TILE - 10, by = interpY*TILE + 8;
        // Hull
        ctx.fillStyle = '#6b4020';
        ctx.fillRect(bx, by + 6, 52, 16);
        ctx.fillStyle = '#8b5a30';
        ctx.fillRect(bx + 2, by + 2, 48, 8);
        ctx.fillStyle = PAL.rope;
        ctx.fillRect(bx, by + 8, 52, 3); // gunwale stripe
        // Oars
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(bx - 10, by + 10, 14, 3);
        ctx.fillRect(bx + 48, by + 10, 14, 3);
        // Water ripple around boat
        const rp = Math.sin(frameCount * 0.08) * 2;
        ctx.fillStyle = 'rgba(100,180,255,0.2)';
        ctx.fillRect(bx - 14, by + 16, 80, 4 + rp);
    }

    // Player
    const playerColors = { body: '#2050a0', skin: '#f0c8a0', hair: '#c0a060', legs: '#102840', shoes: '#181818', satchel: playerData.hasLogbook };
    drawPixelChar(interpX*TILE, interpY*TILE, playerData.dir, false, playerColors, 0, playerData.moving);
    drawParticles();
    ctx.restore();
    drawHUD(map.name);
}

// ── Dialogue ──────────────────────────────────────────────────────────────────
function startDialogue(lines, callback) {
    // Substitute player name placeholder wherever NPC dialogue references "Erik"
    currentDialogue = lines.map(l => l.replace(/\bYoung Erik\b/g, 'Young ' + playerData.name).replace(/\bErik\b/g, playerData.name));
    dialogueIndex = 0; dialogueCharIndex = 0; dialogueTimer = 0;
    dialogueComplete = false; dialogueCallback = callback;
    gameState = 'dialogue';
}

function updateDialogue() {
    dialogueTimer++;
    if (!dialogueComplete) {
        if (dialogueTimer % 2 === 0) dialogueCharIndex++;
        if (dialogueCharIndex >= currentDialogue[dialogueIndex].length) dialogueComplete = true;
    }
    if ((keyJustPressed(' ') || keyJustPressed('Enter') || keyJustPressed('z')) && dialogueComplete) {
        dialogueIndex++;
        if (dialogueIndex >= currentDialogue.length) {
            gameState = 'overworld';
            if (dialogueCallback) { const cb = dialogueCallback; dialogueCallback = null; cb(); }
        } else { dialogueCharIndex = 0; dialogueComplete = false; dialogueTimer = 0; }
    }
    if ((keyJustPressed(' ') || keyJustPressed('Enter')) && !dialogueComplete) {
        dialogueCharIndex = currentDialogue[dialogueIndex].length; dialogueComplete = true;
    }
}

function drawDialogue() {
    const boxY = 430, boxH = 150;
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(30, boxY, 740, boxH);
    ctx.strokeStyle = PAL.swYellow;
    ctx.lineWidth = 2;
    ctx.strokeRect(30, boxY, 740, boxH);
    ctx.fillStyle = PAL.swYellow;
    ctx.font = '9px "Press Start 2P"';
    ctx.textAlign = 'left';
    // speaker name
    const map = maps[playerData.currentMap];
    const facingX = playerData.x+(playerData.dir==='right'?1:playerData.dir==='left'?-1:0);
    const facingY = playerData.y+(playerData.dir==='down'?1:playerData.dir==='up'?-1:0);
    const npc = map.npcs.find(n=>n.x===facingX && n.y===facingY);
    if (npc) ctx.fillText(npc.name, 50, boxY+20);

    ctx.fillStyle = '#d8e0f0';
    ctx.font = '9px "Press Start 2P"';
    const text = currentDialogue[dialogueIndex].substring(0, dialogueCharIndex);
    wrapText(text, 50, boxY+40, 700, 20);

    if (dialogueComplete && Math.floor(frameCount/20)%2===0) {
        ctx.fillStyle = PAL.swYellow;
        ctx.fillRect(740, boxY+boxH-20, 8, 4);
        ctx.fillRect(744, boxY+boxH-16, 4, 4);
    }
    ctx.fillStyle = '#505878';
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'right';
    if (currentDialogue.length > 1) ctx.fillText(`${dialogueIndex+1}/${currentDialogue.length}`, 760, boxY+boxH-8);
    ctx.textAlign = 'left';
}

function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '', cy = y;
    words.forEach(word => {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > maxWidth && line !== '') {
            ctx.fillText(line.trim(), x, cy); line = word + ' '; cy += lineHeight;
        } else line = test;
    });
    if (line) ctx.fillText(line.trim(), x, cy);
}

// ── Battle ────────────────────────────────────────────────────────────────────
function startBattle(npc) {
    const quiz = quizSets[npc.quizKey];
    const diff = quiz.difficulty || { hpLossPerWrong: 35, passThreshold: 4 };
    battleState = {
        enemy: npc.name, quizKey: npc.quizKey,
        questions: shuffleArray([...quiz.questions]).slice(0, 5), // pick 5 random from 8
        currentQ: 0, phase: 'question',
        playerHP: playerData.hp, enemyHP: 100, maxEnemyHP: 100,
        selected: 0, answered: false, wasCorrect: false,
        resultTimer: 0, isBoss: true,
        enemyColors: { ...npc.colors, isSpirit: npc.isSpirit },
        intro: npc.battleIntro || `${npc.name} challenges you!`,
        combo: 0, comboMax: 0, introTimer: 0,
        hpLossPerWrong: diff.hpLossPerWrong,
        passThreshold: diff.passThreshold,
        wrongCount: 0,
    };
    gameState = 'battleIntro';
}

function updateBattle() {
    if (gameState === 'battleIntro') {
        battleState.introTimer++;
        if (battleState.introTimer > 80 || keyJustPressed(' ')) gameState = 'battle';
        return;
    }

    if (battleState.phase === 'question') {
        // 2x2 grid: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
        if (keyJustPressed('ArrowUp')) {
            if (battleState.selected >= 2) battleState.selected -= 2; // bottom row → top row
        }
        if (keyJustPressed('ArrowDown')) {
            if (battleState.selected <= 1) battleState.selected += 2; // top row → bottom row
        }
        if (keyJustPressed('ArrowLeft')) {
            if (battleState.selected % 2 === 1) battleState.selected -= 1; // right col → left col
        }
        if (keyJustPressed('ArrowRight')) {
            if (battleState.selected % 2 === 0) battleState.selected += 1; // left col → right col
        }
        if ((keyJustPressed(' ') || keyJustPressed('Enter') || keyJustPressed('z')) && !battleState.answered) {
            battleState.answered = true;
            const q = battleState.questions[battleState.currentQ];
            battleState.wasCorrect = (battleState.selected === q.correct);
            playerData.questionsAnswered++;
            if (battleState.wasCorrect) {
                playerData.correctAnswers++;
                battleState.combo++;
                if (battleState.combo > battleState.comboMax) battleState.comboMax = battleState.combo;
                const dmg = battleState.combo >= 3 ? 28 : battleState.combo >= 2 ? 24 : 20;
                battleState.enemyHP = Math.max(0, battleState.enemyHP - dmg);
                screenShake = battleState.combo >= 3 ? 10 : 6;
                spawnParticles(600, 300, battleState.combo >= 3 ? PAL.gold : PAL.swYellow, battleState.combo >= 2 ? 12 : 8);
                if (battleState.combo >= 2) playerData.xp += 5; // streak bonus
            } else {
                battleState.combo = 0;
                battleState.wrongCount = (battleState.wrongCount || 0) + 1;
                battleState.playerHP = Math.max(0, battleState.playerHP - battleState.hpLossPerWrong);
                screenShake = 4;
                spawnParticles(200, 300, '#d04040', 6);
            }
            battleState.phase = 'result'; battleState.resultTimer = 0;
        }
    } else if (battleState.phase === 'result') {
        battleState.resultTimer++;
        // Determine win/fail state to show on result screen
        const maxWrong = battleState.questions.length - battleState.passThreshold; // e.g. 5-4=1 wrong allowed for quiz1
        const failedByWrong = battleState.wrongCount > maxWrong;
        const questionsRemaining = battleState.questions.length - (battleState.currentQ + 1);
        const correctSoFar = (battleState.currentQ + 1) - battleState.wrongCount;
        const canStillPass = (correctSoFar + questionsRemaining) >= battleState.passThreshold && !failedByWrong;
        const alreadyWon = correctSoFar >= battleState.passThreshold;

        if (battleState.resultTimer > 50 && (keyJustPressed(' ') || keyJustPressed('Enter'))) {
            if (alreadyWon) {
                // Victory — enough correct answers reached the pass threshold
                playerData.defeatedBosses.push(battleState.quizKey);
                playerData.xp += 100;
                if (playerData.xp >= playerData.level*50) { playerData.level++; playerData.maxHp+=10; playerData.hp=playerData.maxHp; }
                playerData.hp = playerData.maxHp;
                screenShake = 0;
                gameState = 'victory';
            } else if (failedByWrong || battleState.playerHP <= 0) {
                // Failed — too many wrong answers
                playerData.hp = Math.floor(playerData.maxHp * 0.5);
                battleState.playerHP = playerData.hp; battleState.enemyHP = battleState.maxEnemyHP;
                battleState.answered = false; battleState.currentQ = 0; battleState.phase = 'question';
                battleState.selected = 0; battleState.wrongCount = 0; battleState.combo = 0;
            } else if (battleState.currentQ + 1 >= battleState.questions.length) {
                // Ran out of questions without winning — restart
                playerData.hp = Math.floor(playerData.maxHp * 0.5);
                battleState.playerHP = playerData.hp; battleState.enemyHP = battleState.maxEnemyHP;
                battleState.answered = false; battleState.currentQ = 0; battleState.phase = 'question';
                battleState.selected = 0; battleState.wrongCount = 0; battleState.combo = 0;
            } else {
                battleState.currentQ++;
                battleState.answered = false; battleState.phase = 'question'; battleState.selected = 0;
            }
        }
    }
}

function drawBattleBackground(quizKey) {
    if (quizKey === 'quiz1') {
        // Shipyard — dark wood planks + forge glow
        ctx.fillStyle = '#120a04'; ctx.fillRect(0,0,800,600);
        for (let y=0; y<600; y+=26) {
            ctx.fillStyle = `rgba(70,35,12,${0.25+Math.sin(y*0.08+frameCount*0.004)*0.08})`;
            ctx.fillRect(0, y, 800, 24);
            ctx.fillStyle = 'rgba(40,18,6,0.5)';
            ctx.fillRect(0, y+24, 800, 2);
        }
        // Forge glow in corner
        const fg = Math.sin(frameCount*0.07)*0.12+0.12;
        const g1 = ctx.createRadialGradient(720,540,10,720,540,180);
        g1.addColorStop(0,`rgba(255,100,20,${fg})`); g1.addColorStop(1,'rgba(255,60,0,0)');
        ctx.fillStyle=g1; ctx.fillRect(0,0,800,600);
    } else if (quizKey === 'quiz2') {
        // Harbor — stormy water + rain
        ctx.fillStyle = '#05080f'; ctx.fillRect(0,0,800,600);
        for (let x=0; x<800; x+=42) {
            const wh = 28 + Math.sin(x*0.05+frameCount*0.04)*14;
            ctx.fillStyle=`rgba(0,30,70,${0.4+Math.sin(x*0.08+frameCount*0.025)*0.12})`;
            ctx.fillRect(x, 420+Math.sin(x*0.04+frameCount*0.025)*10, 42, wh+200);
        }
        for (let i=0; i<22; i++) {
            const rx=(i*73+frameCount*5)%800, ry=(i*41+frameCount*7)%480;
            ctx.fillStyle='rgba(160,210,255,0.25)';
            ctx.fillRect(rx-1, ry, 2, 9);
        }
        // Lightning flash
        if (frameCount%180 < 3) { ctx.fillStyle='rgba(200,230,255,0.08)'; ctx.fillRect(0,0,800,600); }
    } else if (quizKey === 'quiz3') {
        // Museum ghost — ethereal fog + wisps
        ctx.fillStyle = '#080d15'; ctx.fillRect(0,0,800,600);
        for (let i=0; i<7; i++) {
            const gx=(i*130+Math.sin(frameCount*0.01+i)*40+frameCount*0.2)%900-50;
            const gy=220+Math.cos(frameCount*0.007+i*0.9)*70;
            const gr = ctx.createRadialGradient(gx,gy,0,gx,gy,90+Math.sin(frameCount*0.03+i)*20);
            gr.addColorStop(0,`rgba(60,100,180,${Math.sin(frameCount*0.04+i)*0.04+0.06})`);
            gr.addColorStop(1,'rgba(30,60,120,0)');
            ctx.fillStyle=gr; ctx.fillRect(0,0,800,600);
        }
    } else {
        const bg = ctx.createLinearGradient(0,0,0,600);
        bg.addColorStop(0,'#060c18'); bg.addColorStop(1,'#0a1828');
        ctx.fillStyle=bg; ctx.fillRect(0,0,800,600);
    }
    // Ambient stars
    for (let i=0; i<20; i++) {
        const sx=(i*37+frameCount*0.3)%800, sy=(i*53+frameCount*0.15)%280;
        ctx.fillStyle=`rgba(200,220,255,${(Math.sin(frameCount*0.05+i)*0.25+0.35)*0.5})`;
        ctx.fillRect(sx,sy,2,2);
    }
}

function drawBattle() {
    drawBattleBackground(battleState.quizKey);

    if (gameState === 'battleIntro') {
        const a = Math.min(1, battleState.introTimer/40);
        ctx.globalAlpha = a;
        // Flash effect
        if (battleState.introTimer < 6) { ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.fillRect(0,0,800,600); }
        ctx.fillStyle = PAL.swYellow;
        ctx.font = '14px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(battleState.intro, 400, 195);
        ctx.fillStyle = '#a0b0d0';
        ctx.font = '9px "Press Start 2P"';
        ctx.fillText('Answer correctly to deal damage!', 400, 228);
        ctx.fillStyle = '#6080a8'; ctx.font='7px "Press Start 2P"';
        ctx.fillText('Combo streaks deal bonus damage', 400, 252);
        ctx.globalAlpha = 1;
        // Big enemy portrait on intro
        ctx.save(); ctx.translate(400, 380); ctx.scale(2.2, 2.2);
        drawPixelChar(-16, -32, battleState.enemyColors.isSpirit ? 'down' : 'down', true, battleState.enemyColors);
        ctx.restore();
        drawParticles(); return;
    }

    const q = battleState.questions[battleState.currentQ];
    ctx.textAlign = 'center';

    // Enemy area — scaled up sprite
    ctx.save(); ctx.translate(620, 165); ctx.scale(1.8, 1.8);
    drawPixelChar(-16, -32, 'left', true, battleState.enemyColors);
    ctx.restore();
    // Enemy name + HP
    ctx.fillStyle = battleState.enemyColors.isSpirit ? '#90b8e0' : '#909090';
    ctx.font = '8px "Press Start 2P"'; ctx.textAlign='center';
    ctx.fillText(battleState.enemy, 620, 82);
    ctx.fillStyle = '#202030'; ctx.fillRect(480, 88, 270, 14);
    const hpPct = battleState.enemyHP / battleState.maxEnemyHP;
    ctx.fillStyle = hpPct > 0.5 ? PAL.hpGreen : hpPct > 0.25 ? PAL.hpYellow : PAL.hpRed;
    ctx.fillRect(481, 89, Math.max(0, hpPct*268), 12);
    ctx.strokeStyle = '#5060a0'; ctx.lineWidth=1; ctx.strokeRect(480, 88, 270, 14);
    ctx.fillStyle='#8090b0'; ctx.font='7px "Press Start 2P"';
    ctx.fillText(`${battleState.enemyHP}/100`, 620, 120);

    // Player side
    ctx.fillStyle='#909090'; ctx.font='8px "Press Start 2P"'; ctx.textAlign='left';
    ctx.fillText('Young ' + playerData.name, 50, 90);
    ctx.fillStyle='#202030'; ctx.fillRect(50, 96, 210, 12);
    const phPct = battleState.playerHP/playerData.maxHp;
    ctx.fillStyle = phPct > 0.5 ? PAL.hpGreen : phPct > 0.25 ? PAL.hpYellow : PAL.hpRed;
    ctx.fillRect(51, 97, Math.max(0,phPct*208), 10);
    ctx.strokeStyle='#405070'; ctx.lineWidth=1; ctx.strokeRect(50,96,210,12);
    ctx.fillStyle='#8090b0'; ctx.font='7px "Press Start 2P"';
    ctx.fillText(`${battleState.playerHP} / ${playerData.maxHp} HP`, 50, 124);

    // Streak indicator
    if (battleState.combo >= 2) {
        const sc = battleState.combo >= 3 ? PAL.gold : '#f08020';
        ctx.fillStyle = sc; ctx.font='9px "Press Start 2P"'; ctx.textAlign='left';
        ctx.fillText(`${battleState.combo}x STREAK!`, 50, 160);
        if (battleState.combo >= 3) {
            ctx.fillStyle='rgba(212,168,0,0.15)'; ctx.fillRect(0,0,800,600);
        }
    }

    // Question counter + box
    ctx.fillStyle='#5070a0'; ctx.font='7px "Press Start 2P"'; ctx.textAlign='center';
    ctx.fillText(`QUESTION  ${battleState.currentQ+1} / ${battleState.questions.length}`, 400, 225);
    ctx.fillStyle='rgba(0,0,0,0.88)'; ctx.fillRect(30,232,740,78);
    ctx.strokeStyle=PAL.swBlue; ctx.lineWidth=2; ctx.strokeRect(30,232,740,78);
    ctx.fillStyle='#d0d8f0'; ctx.font='9px "Press Start 2P"'; ctx.textAlign='center';
    wrapTextCentered(q.q, 400, 270, 680, 20);

    // Answer options
    if (battleState.phase === 'question') {
        for (let i=0; i<4; i++) {
            const ox=60+(i%2)*370, oy=330+(Math.floor(i/2))*56;
            const isSel = battleState.selected===i;
            ctx.fillStyle = isSel ? 'rgba(0,106,167,0.5)' : 'rgba(0,0,0,0.6)';
            ctx.fillRect(ox,oy,340,46);
            ctx.strokeStyle = isSel ? PAL.swYellow : '#304060';
            ctx.lineWidth = isSel ? 2 : 1; ctx.strokeRect(ox,oy,340,46);
            ctx.fillStyle = isSel ? PAL.swYellow : '#a0b0d0';
            ctx.font='8px "Press Start 2P"'; ctx.textAlign='left';
            wrapText(q.options[i], ox+12, oy+17, 316, 16);
        }
    } else if (battleState.phase === 'result') {
        const corr = battleState.wasCorrect;
        ctx.fillStyle = corr ? 'rgba(0,90,0,0.75)' : 'rgba(100,0,0,0.75)';
        ctx.fillRect(30,322,740,218);
        ctx.strokeStyle = corr ? PAL.hpGreen : PAL.hpRed;
        ctx.lineWidth=2; ctx.strokeRect(30,322,740,218);
        ctx.fillStyle = corr ? PAL.hpGreen : PAL.hpRed;
        ctx.font='16px "Press Start 2P"'; ctx.textAlign='center';
        ctx.fillText(corr ? 'CORRECT!' : 'WRONG!', 400, 368);
        if (corr && battleState.combo >= 2) {
            ctx.fillStyle=PAL.gold; ctx.font='10px "Press Start 2P"';
            ctx.fillText(`${battleState.combo}x STREAK — EXTRA DAMAGE!`, 400, 396);
        }
        if (!corr) {
            ctx.fillStyle='#d0d8f0'; ctx.font='8px "Press Start 2P"';
            ctx.fillText(`Correct answer: ${q.options[q.correct]}`, 400, 398);
        }
        // Historical fact — always shown
        if (q.fact) {
            ctx.fillStyle = corr ? 'rgba(160,220,255,0.9)' : 'rgba(160,200,255,0.8)';
            ctx.font='7px "Press Start 2P"';
            ctx.fillStyle = '#90b8e0';
            wrapTextCentered('DID YOU KNOW: ' + q.fact, 400, corr ? 420 : 440, 690, 16);
        }
        if (battleState.resultTimer > 50 && Math.floor(frameCount/20)%2===0) {
            ctx.fillStyle='#8090b0'; ctx.font='8px "Press Start 2P"';
            ctx.fillText('Press SPACE to continue', 400, 516);
        }
    }

    ctx.textAlign='left';
    drawParticles();
}

function wrapTextCentered(text, cx, y, maxWidth, lh) {
    const words = text.split(' ');
    let line = '';
    const lines = [];
    words.forEach(w => {
        const test = line + w + ' ';
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line.trim()); line=w+' '; }
        else line = test;
    });
    if (line) lines.push(line.trim());
    lines.forEach((l,i) => ctx.fillText(l, cx, y + i*lh));
}

// ── Victory ───────────────────────────────────────────────────────────────────
function drawVictory() {
    ctx.fillStyle = '#060c18'; ctx.fillRect(0, 0, 800, 600);
    if (frameCount%5===0) spawnParticles(Math.random()*800, -10, ['#fcd116','#006aa7','#ffffff'][Math.floor(Math.random()*3)], 3);

    ctx.textAlign = 'center';
    const t = Math.min(1, battleState.resultTimer/30);
    ctx.fillStyle = PAL.swYellow; ctx.font = '24px "Press Start 2P"';
    ctx.fillText('VICTORY!', 400, 80*t+60);
    ctx.fillStyle = '#c0d0e8'; ctx.font = '12px "Press Start 2P"';
    ctx.fillText(`${battleState.enemy} defeated!`, 400, 160);
    ctx.fillStyle = PAL.xpBlue; ctx.font = '14px "Press Start 2P"';
    ctx.fillText(`+100 XP`, 400, 220);
    ctx.fillStyle = '#a0b0d0'; ctx.font = '10px "Press Start 2P"';
    ctx.fillText(`Level: ${playerData.level}`, 400, 280);
    ctx.fillText(`Total Correct: ${playerData.correctAnswers}/${playerData.questionsAnswered}`, 400, 310);

    const learnings = {
        quiz1: 'King Gustav II Adolf ordered the Vasa built with\ntwo gun decks — making her dangerously top-heavy.',
        quiz2: 'The Vasa sank on August 10, 1628,\njust 1,300 meters from the dock.',
        quiz3: 'Anders Franzen found the Vasa in 1956.\nShe was raised in 1961. The museum opened in 1990.',
    };
    ctx.fillStyle = PAL.swYellow; ctx.font = '10px "Press Start 2P"';
    ctx.fillText('KEY LEARNING:', 400, 370);
    ctx.fillStyle = '#c0d0e8'; ctx.font = '9px "Press Start 2P"';
    (learnings[battleState.quizKey]||'').split('\n').forEach((l,i) => ctx.fillText(l, 400, 400+i*20));

    if (battleState.resultTimer > 60) {
        const nextHints = {
            quiz1: 'Head south to the harbor warp!',
            quiz2: '333 years pass... The Vasa is raised from the deep.',
            quiz3: 'One more step. Travel to the Archive.'
        };
        ctx.fillStyle = '#70d070'; ctx.font = '10px "Press Start 2P"';
        ctx.fillText(nextHints[battleState.quizKey]||'', 400, 480);
    }
    if (battleState.resultTimer > 60 && Math.floor(frameCount/20)%2===0) {
        ctx.fillStyle = '#8090b0'; ctx.font='8px "Press Start 2P"';
        ctx.fillText('Press SPACE to continue', 400, 560);
    }
    battleState.resultTimer++;
    if (battleState.resultTimer > 60 && (keyJustPressed(' ') || keyJustPressed('Enter'))) {
        const qk = battleState.quizKey;
        battleState = null; playerData.hp = playerData.maxHp;
        if (qk === 'quiz2') {
            startDialogue([
                'The Admiral signs your logbook. Second testimony secured.',
                '333 years pass...',
                'The Vasa is raised from the harbor on April 24, 1961.',
                'A museum is built around her. Your spirit travels forward — to 1990.'
            ], () => startMapTransition('museum', 4, 9));
        } else if (qk === 'quiz3') {
            startDialogue([
                'The King\'s ghost bows his head. "Erik... three testimonies. It is enough."',
                '"The Shipwright. The Admiral. Now me — the man who ordered it all."',
                '"Go to the Archive. Present your case. The captain awaits his verdict."',
                'Travel through the Museum to the Archive entrance at the south wall.'
            ], () => startMapTransition('archive', 12, 9));
        } else {
            gameState = 'overworld';
        }
    }
    ctx.textAlign = 'left';
    drawParticles();
}

// ── Map Transition ─────────────────────────────────────────────────────────────
function startMapTransition(target, toX, toY) {
    mapTransitionDir = 1; mapTransitionAlpha = 0;
    mapTransitionTarget = { map: target, x: toX, y: toY };
    gameState = 'mapTransition';
}

function updateMapTransition() {
    mapTransitionAlpha += mapTransitionDir * 0.06;
    if (mapTransitionAlpha >= 1 && mapTransitionDir === 1) {
        playerData.currentMap = mapTransitionTarget.map;
        playerData.x = mapTransitionTarget.x; playerData.y = mapTransitionTarget.y;
        playerData.targetX = mapTransitionTarget.x; playerData.targetY = mapTransitionTarget.y;
        mapTransitionDir = -1;
    }
    if (mapTransitionAlpha <= 0 && mapTransitionDir === -1) {
        mapTransitionAlpha = 0; gameState = 'overworld';
    }
}

function drawMapTransition() {
    drawOverworld();
    ctx.fillStyle = `rgba(0,0,0,${mapTransitionAlpha})`;
    ctx.fillRect(0, 0, 800, 600);
}

// ── Diploma ────────────────────────────────────────────────────────────────────
function updateDiploma() {
    diplomaTimer++;
    if (diplomaPhase === 0 && diplomaTimer > 60) diplomaPhase = 1;
    if (diplomaPhase === 1 && diplomaTimer > 120) diplomaPhase = 2;
    if (diplomaPhase === 2 && diplomaTimer > 240) diplomaPhase = 3;
}

function drawDiploma() {
    const bgG = ctx.createLinearGradient(0,0,0,600);
    bgG.addColorStop(0,'#06090f'); bgG.addColorStop(0.5,'#0a1428'); bgG.addColorStop(1,'#06090f');
    ctx.fillStyle=bgG; ctx.fillRect(0,0,800,600);

    if (frameCount%5===0 && diplomaPhase>=1) spawnParticles(Math.random()*800,-10,['#fcd116','#006aa7','#ffffff'][Math.floor(Math.random()*3)],3);
    for (let i=0;i<40;i++) {
        const sx=(i*21+frameCount*0.8)%800, sy=(i*17+frameCount*0.3)%600;
        ctx.fillStyle=`rgba(200,220,255,${(Math.sin(frameCount*0.08+i)*0.5+0.5)*0.6})`;
        ctx.fillRect(sx,sy,2,2);
    }

    ctx.textAlign='center';
    if (diplomaPhase===0) {
        const a=Math.min(1,diplomaTimer/40);
        ctx.fillStyle=`rgba(100,200,100,${a})`; ctx.font='12px "Press Start 2P"';
        ctx.fillText('CASE CLOSED', 400, 170);
        ctx.fillStyle=`rgba(252,209,22,${a})`; ctx.font='10px "Press Start 2P"';
        ctx.fillText('Captain Söfring Hansson: RELEASED', 400, 210);
        ctx.fillStyle=`rgba(200,216,240,${a})`; ctx.font='9px "Press Start 2P"';
        ctx.fillText('"Young ' + playerData.name + '... you have documented the truth."', 400, 250);
        ctx.fillText('"The Vasa was built wrong. Not sailed wrong."', 400, 274);
        ctx.fillText('"History will remember what you did here."', 400, 298);
    }

    if (diplomaPhase >= 1 && diplomaPhase < 4) {
        const u=Math.min(1,(diplomaTimer-60)/60);
        const dW=520, dH=420*u, dx=400-dW/2, dy=60;
        ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(dx+6,dy+6,dW,dH);
        const pg=ctx.createLinearGradient(dx,dy,dx+dW,dy+dH);
        pg.addColorStop(0,'#f0e8d0'); pg.addColorStop(0.5,'#faf5e8'); pg.addColorStop(1,'#e8dac0');
        ctx.fillStyle=pg; ctx.fillRect(dx,dy,dW,dH);
        ctx.strokeStyle='#8B6914'; ctx.lineWidth=4; ctx.strokeRect(dx,dy,dW,dH);
        ctx.strokeStyle='#c8a050'; ctx.lineWidth=2; ctx.strokeRect(dx+10,dy+10,dW-20,dH-20);
        if (dH>100) {
            [[dx+15,dy+15],[dx+dW-25,dy+15],[dx+15,dy+dH-25],[dx+dW-25,dy+dH-25]].forEach(([cx,cy])=>{
                if(cy<dy+dH-10){ctx.fillStyle=PAL.swYellow;ctx.fillRect(cx,cy,10,10);ctx.fillStyle='#b0880a';ctx.fillRect(cx+2,cy+2,6,6);}
            });
        }
        // Swedish cross decoration
        ctx.fillStyle=PAL.swYellow;
        ctx.fillRect(dx+dW/2-3,dy+25,6,28); ctx.fillRect(dx+dW/2-12,dy+35,24,6);
    }

    if (diplomaPhase >= 2 && diplomaPhase < 4) {
        const ta=Math.min(1,(diplomaTimer-120)/60), cx=400, dy2=60;
        ctx.globalAlpha=ta;
        ctx.fillStyle='#1a1208'; ctx.font='14px "Press Start 2P"'; ctx.textAlign='center';
        ctx.fillText('CERTIFICATE OF', cx, dy2+80); ctx.fillText('MARITIME HISTORY', cx, dy2+104);
        ctx.fillStyle='#3a2010'; ctx.font='9px "Press Start 2P"';
        ctx.fillText('This diploma is presented to', cx, dy2+140);
        ctx.fillStyle='#8b0000'; ctx.font='16px "Press Start 2P"';
        ctx.fillText('YOUNG ERIK', cx, dy2+170);
        ctx.fillStyle='#3a2010'; ctx.font='8px "Press Start 2P"';
        ctx.fillText('For documenting the truth behind the Vasa,', cx, dy2+200);
        ctx.fillText('Sweden\'s greatest warship, and demonstrating', cx, dy2+218);
        ctx.fillText('mastery of 17th-century maritime history.', cx, dy2+236);
        ctx.fillStyle='#1a1208'; ctx.font='10px "Press Start 2P"';
        ctx.fillText('The Vasa & the Baltic Sea', cx, dy2+264);
        const pct=playerData.questionsAnswered>0?Math.round(playerData.correctAnswers/playerData.questionsAnswered*100):0;
        ctx.fillStyle='#3a2010'; ctx.font='8px "Press Start 2P"';
        ctx.fillText(`Score: ${playerData.correctAnswers}/${playerData.questionsAnswered} (${pct}%)`, cx, dy2+295);
        ctx.fillText(`Level: ${playerData.level}   XP: ${playerData.xp}`, cx, dy2+313);
        let grade='F';
        if(pct>=95)grade='A+';else if(pct>=90)grade='A';else if(pct>=80)grade='B';else if(pct>=70)grade='C';else if(pct>=60)grade='D';
        ctx.fillStyle=pct>=90?'#2a6a2a':pct>=70?'#3a2010':'#8b0000';
        ctx.font='14px "Press Start 2P"'; ctx.fillText(`Grade: ${grade}`, cx, dy2+345);
        ctx.strokeStyle='#c8a050'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx-230,dy2+360); ctx.lineTo(cx+230,dy2+360); ctx.stroke();
        // Seal
        ctx.fillStyle='#006AA7'; ctx.beginPath(); ctx.arc(cx-140,dy2+388,20,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#0080c0'; ctx.beginPath(); ctx.arc(cx-140,dy2+388,15,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=PAL.swYellow; ctx.font='6px "Press Start 2P"'; ctx.fillText('VASA',cx-140,dy2+391);
        // Signature
        ctx.fillStyle='#1a0a0a'; ctx.font='10px "Press Start 2P"';
        ctx.textAlign='right'; ctx.fillText('King Gustav II Adolf',cx+200,dy2+383);
        ctx.font='7px "Press Start 2P"'; ctx.fillText('Stockholm, 1628',cx+200,dy2+398);
        ctx.textAlign='left';
        ctx.globalAlpha=1;
    }

    if (diplomaPhase===3) {
        ctx.fillStyle=PAL.swYellow; ctx.font='12px "Press Start 2P"';
        const bob=Math.sin(frameCount*0.05)*3;
        ctx.textAlign='center'; ctx.fillText('HISTORY DOCUMENTED!', 400, 510+bob);
        ctx.fillStyle='#a0b0d0'; ctx.font='8px "Press Start 2P"';
        ctx.fillText('The Vasa — lost for 333 years — now', 400, 538);
        ctx.fillText('stands in her museum for all the world.', 400, 554);
        if (Math.floor(frameCount/25)%2===0) {
            ctx.fillStyle='#8090b0'; ctx.font='8px "Press Start 2P"';
            ctx.fillText('Press SPACE to continue', 400, 578);
        }
        if (keyJustPressed(' ') || keyJustPressed('Enter')) {
            gameState='slideshow'; slideshowIndex=0; slideshowTimer=0; slideshowAlpha=0;
        }
    }
    if (diplomaPhase===4) {
        ctx.fillStyle='rgba(0,0,0,0.92)'; ctx.fillRect(0,0,800,600);
        ctx.fillStyle=PAL.swYellow; ctx.font='14px "Press Start 2P"'; ctx.textAlign='center';
        ctx.fillText('FURTHER READING',400,60);
        ctx.strokeStyle='#c8a050'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(200,72); ctx.lineTo(600,72); ctx.stroke();
        ctx.fillStyle='#c0c0e0'; ctx.font='8px "Press Start 2P"';
        ctx.fillText('To learn more about the Vasa:',400,100);
        ctx.textAlign='left'; ctx.font='7px "Press Start 2P"';
        let ry=140;
        furtherReading.forEach((s,idx)=>{
            ctx.fillStyle='#a0a0d0'; ctx.fillText(`${idx+1}.`,100,ry);
            ctx.fillStyle='#d0d0e0';
            const words=s.split(' '); let line='';
            const lines=[];
            words.forEach(w=>{const t=line+(line?' ':'')+w;if(ctx.measureText(t).width>560&&line){lines.push(line);line=w;}else line=t;});
            if(line)lines.push(line);
            lines.forEach((l,li)=>ctx.fillText(l,130,ry+li*16));
            ry+=lines.length*16+12;
        });
        ctx.textAlign='center'; ctx.fillStyle='#8888bb'; ctx.font='8px "Press Start 2P"';
        ctx.fillText('Thank you for playing Vasa: The Sunken Pride!',400,500);
        if(Math.floor(frameCount/25)%2===0){ctx.fillStyle='#8080b0';ctx.font='8px "Press Start 2P"';ctx.fillText('Press SPACE to play again',400,560);}
        if(keyJustPressed(' ')||keyJustPressed('Enter')){resetGame();gameState='title';}
    }
    ctx.textAlign='left'; drawParticles();
}

// ── Slideshow ─────────────────────────────────────────────────────────────────
function updateSlideshow() {
    slideshowTimer++;
    if (slideshowAlpha < 1) slideshowAlpha = Math.min(1, slideshowAlpha + 0.04);
    if (slideshowAlpha >= 1 && (keyJustPressed(' ') || keyJustPressed('Enter') || keyJustPressed('ArrowRight'))) {
        if (slideshowIndex < slideshowSlides.length - 1) { slideshowIndex++; slideshowAlpha=0; slideshowTimer=0; }
        else { diplomaPhase=4; diplomaTimer=0; gameState='diploma'; }
    }
    if (keyJustPressed('ArrowLeft') && slideshowIndex > 0) { slideshowIndex--; slideshowAlpha=0; slideshowTimer=0; }
}

function drawSlideshow() {
    const s = slideshowSlides[slideshowIndex];
    const bg=ctx.createLinearGradient(0,0,0,600);
    bg.addColorStop(0,s.bg1); bg.addColorStop(1,s.bg2);
    ctx.fillStyle=bg; ctx.fillRect(0,0,800,600);

    for(let i=0;i<25;i++){const sx=(i*37+frameCount*0.3)%800,sy=(i*53+frameCount*0.1)%600;ctx.fillStyle=`rgba(200,220,255,${(Math.sin(frameCount*0.05+i)*0.3+0.4)*slideshowAlpha*0.35})`;ctx.fillRect(sx,sy,2,2);}

    ctx.globalAlpha=slideshowAlpha;
    ctx.fillStyle=s.accent; ctx.fillRect(0,0,800,5); ctx.fillRect(0,595,800,5);

    // Simple icon
    ctx.save(); ctx.translate(140, 240);
    drawSlideshowIcon(s.icon, s.accent);
    ctx.restore();

    ctx.fillStyle=s.accent; ctx.font='16px "Press Start 2P"'; ctx.textAlign='center';
    ctx.fillText(s.title, 490, 130);
    ctx.fillStyle='rgba(180,190,210,0.7)'; ctx.font='8px "Press Start 2P"';
    ctx.fillText(s.sub, 490, 158);
    ctx.strokeStyle=s.accent; ctx.globalAlpha=slideshowAlpha*0.35; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(310,168); ctx.lineTo(680,168); ctx.stroke();
    ctx.globalAlpha=slideshowAlpha;

    ctx.fillStyle='#c8d0e0'; ctx.font='9px "Press Start 2P"'; ctx.textAlign='left';
    let by=195; s.lines.forEach(l=>{if(l===''){by+=10;return;}ctx.fillText(l,310,by);by+=22;});

    // Dots
    const tot=slideshowSlides.length, dx=400-(tot*18)/2;
    for(let i=0;i<tot;i++){ctx.fillStyle=i===slideshowIndex?s.accent:'rgba(120,130,150,0.4)';ctx.beginPath();ctx.arc(dx+i*18,572,i===slideshowIndex?5:3,0,Math.PI*2);ctx.fill();}

    if(Math.floor(frameCount/25)%2===0&&slideshowAlpha>=1){ctx.fillStyle='rgba(130,140,160,0.7)';ctx.font='7px "Press Start 2P"';ctx.textAlign='center';ctx.fillText(slideshowIndex===slideshowSlides.length-1?'SPACE for further reading':'SPACE for next',490,548);}
    ctx.globalAlpha=1; ctx.textAlign='left';
}

function drawSlideshowIcon(icon, accent) {
    switch(icon) {
        case 'ship':
            ctx.fillStyle='#4a2010'; ctx.fillRect(-40,0,80,20);
            ctx.fillRect(-35,-5,70,6);
            ctx.fillStyle=accent; ctx.fillRect(-38,-2,76,3);
            ctx.fillStyle='#5a3018'; ctx.fillRect(-2,-30,4,32);
            ctx.fillStyle='rgba(240,240,210,0.8)'; ctx.fillRect(-2,-28,22,20);
            ctx.fillStyle=accent; ctx.fillRect(-36,-6,6,6); ctx.fillRect(30,-6,6,6);
            break;
        case 'wave':
            for(let i=0;i<3;i++){ctx.fillStyle=i%2===0?'#1a5090':'#0a3060';ctx.fillRect(-36+i*26,-6,20,12);}
            ctx.fillStyle='rgba(100,180,255,0.5)'; ctx.fillRect(-38,8,76,8);
            break;
        case 'anchor':
            ctx.strokeStyle=accent; ctx.lineWidth=4;
            ctx.beginPath(); ctx.arc(0,-10,12,0,Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0,-22); ctx.lineTo(0,20); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-18,20); ctx.lineTo(18,20); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-18,4); ctx.arc(0,4,18,Math.PI,0); ctx.stroke();
            break;
        case 'star':
            for(let i=0;i<5;i++){const a=(i*72-90)*Math.PI/180;ctx.fillStyle=accent;ctx.fillRect(Math.cos(a)*26-3,Math.sin(a)*26-3,6,6);}
            ctx.fillStyle=accent; ctx.fillRect(-3,-3,6,6);
            break;
        case 'crown':
            ctx.fillStyle=accent;
            ctx.fillRect(-28,2,56,16);
            ctx.fillRect(-28,-14,8,18); ctx.fillRect(-4,-22,8,26); ctx.fillRect(20,-14,8,18);
            ctx.fillStyle='#8b0000';
            ctx.beginPath(); ctx.arc(-24,-4,5,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(0,-18,5,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(24,-4,5,0,Math.PI*2); ctx.fill();
            break;
        case 'globe':
        default:
            ctx.strokeStyle=accent; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(0,0,28,0,Math.PI*2); ctx.stroke();
            [-14,0,14].forEach(oy=>{const r=Math.sqrt(784-oy*oy);ctx.beginPath();ctx.moveTo(-r,oy);ctx.lineTo(r,oy);ctx.stroke();});
            ctx.beginPath(); ctx.moveTo(0,-28); ctx.lineTo(0,28); ctx.stroke();
            break;
    }
}

// ── Codex ──────────────────────────────────────────────────────────────────────
function updateCodex() {
    if (keyJustPressed('ArrowLeft')) codexPage = Math.max(0, codexPage - 1);
    if (keyJustPressed('ArrowRight')) codexPage++;
    if (keyJustPressed('c') || keyJustPressed('C') || keyJustPressed('Escape')) {
        codexOpen = false; gameState = 'overworld';
    }
}

function drawCodex() {
    // Draw overworld underneath
    drawOverworld();
    // Overlay panel
    ctx.fillStyle = 'rgba(8,6,3,0.94)'; ctx.fillRect(30,20,740,560);
    ctx.strokeStyle = PAL.gold; ctx.lineWidth=2; ctx.strokeRect(30,20,740,560);
    ctx.strokeStyle = 'rgba(212,168,0,0.3)'; ctx.lineWidth=1; ctx.strokeRect(38,28,724,544);

    ctx.fillStyle = PAL.gold; ctx.font='11px "Press Start 2P"'; ctx.textAlign='center';
    ctx.fillText('FIELD NOTES', 400, 56);
    ctx.fillStyle = '#806030'; ctx.font='7px "Press Start 2P"';
    ctx.fillText('Evidence gathered for the Royal Inquiry', 400, 74);
    ctx.strokeStyle='rgba(212,168,0,0.4)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(60,84); ctx.lineTo(740,84); ctx.stroke();

    // Collect all non-artifact NPCs the player has talked to
    const allNpcs = Object.values(maps).flatMap(m => m.npcs).filter(n => !n.isArtifact && !n.isBoss);
    const talked = allNpcs.filter(n => playerData.talkedToNpcs.includes(n.id));

    if (talked.length === 0) {
        ctx.fillStyle = '#5060a0'; ctx.font='9px "Press Start 2P"'; ctx.textAlign='center';
        ctx.fillText('No witnesses interviewed yet.', 400, 300);
        ctx.fillStyle='#384060'; ctx.font='8px "Press Start 2P"';
        ctx.fillText('Speak to people to build your case.', 400, 328);
    } else {
        const pi = ((codexPage % talked.length) + talked.length) % talked.length;
        const npc = talked[pi];
        ctx.fillStyle = '#d0b060'; ctx.font='10px "Press Start 2P"'; ctx.textAlign='left';
        ctx.fillText(npc.name, 60, 116);
        ctx.fillStyle = '#4060a0'; ctx.font='7px "Press Start 2P"';
        const mapNames = { shipyard:'Royal Shipyard, 1628', harbor:'Stockholm Harbor, 1628', museum:'Vasa Museum, 1990', archive:'Vasa Archive' };
        const loc = Object.keys(maps).find(k => maps[k].npcs.includes(npc));
        ctx.fillText(mapNames[loc]||'', 60, 134);

        // Show all their dialogue lines as testimony
        ctx.fillStyle = '#c0d0e8'; ctx.font='8px "Press Start 2P"'; ctx.textAlign='left';
        let ty = 162;
        npc.dialogue.forEach(line => {
            if (ty > 490) return;
            ctx.fillStyle = '#c0d0e8';
            wrapText('"' + line + '"', 60, ty, 680, 18);
            ty += 18 * Math.ceil(ctx.measureText('"' + line + '"').width / 680) + 4;
        });

        // Navigation
        ctx.fillStyle='#506080'; ctx.font='7px "Press Start 2P"'; ctx.textAlign='center';
        ctx.fillText(`Witness ${pi+1} of ${talked.length}  --  [<] [>] to browse`, 400, 530);
    }

    // Artifact section
    const artFound = Object.values(maps).flatMap(m => m.npcs).filter(n => n.isArtifact && playerData.talkedToNpcs.includes(n.id));
    const artTotal = Object.values(maps).flatMap(m => m.npcs).filter(n => n.isArtifact).length;
    ctx.fillStyle = artFound.length === artTotal ? PAL.gold : '#806030';
    ctx.font='7px "Press Start 2P"'; ctx.textAlign='center';
    ctx.fillText(`★ Artifacts found: ${artFound.length} / ${artTotal}`, 400, 552);

    ctx.fillStyle='#405070'; ctx.font='7px "Press Start 2P"';
    ctx.fillText('[C] or [ESC] to close', 400, 570);
    ctx.textAlign='left';
}

// ── Name Entry ─────────────────────────────────────────────────────────────────
function showNameInput() {
    const overlay = document.getElementById('name-overlay');
    const input = document.getElementById('name-input');
    if (!overlay || !input) return;
    input.value = '';
    overlay.classList.add('visible');
    // Small delay so mobile keyboard doesn't obscure before layout settles
    setTimeout(() => input.focus(), 80);
}

function hideNameInput() {
    const overlay = document.getElementById('name-overlay');
    if (overlay) overlay.classList.remove('visible');
}

function confirmName() {
    const input = document.getElementById('name-input');
    const raw = input ? input.value.trim() : '';
    playerData.name = raw.length > 0 ? raw : 'Erik';
    hideNameInput();
    buildPrologueScenes();
    prologueStep = 0; prologueTimer = 0; prologueTextTimer = 0;
    gameState = 'prologue';
}

(function setupNameEntry() {
    // Wait for DOM to be ready
    function init() {
        const input = document.getElementById('name-input');
        const btn = document.getElementById('name-begin');
        if (!input || !btn) { setTimeout(init, 50); return; }
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); confirmName(); }
            // Block game key handling while typing
            e.stopPropagation();
        });
        input.addEventListener('keyup', e => e.stopPropagation());
        input.addEventListener('keypress', e => e.stopPropagation());
        btn.addEventListener('click', () => confirmName());
        btn.addEventListener('touchend', e => { e.preventDefault(); confirmName(); });
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
    else { init(); }
})();

// ── Title Screen ───────────────────────────────────────────────────────────────
function updateTitle() {
    titleBlink++;
    if (keyJustPressed('ArrowUp')) titleSelection = Math.max(0, titleSelection-1);
    if (keyJustPressed('ArrowDown')) titleSelection = Math.min(1, titleSelection+1);
    if (keyJustPressed(' ') || keyJustPressed('Enter') || keyJustPressed('z')) {
        if (titleSelection===0) { gameState='nameEntry'; showNameInput(); }
    }
}

function drawTitle() {
    const bg=ctx.createLinearGradient(0,0,0,600);
    bg.addColorStop(0,'#04080f'); bg.addColorStop(0.6,'#080f1e'); bg.addColorStop(1,'#0a1828');
    ctx.fillStyle=bg; ctx.fillRect(0,0,800,600);

    // Animated water
    for(let x=0;x<800;x+=32) {
        const h=20+Math.sin((x/60)+frameCount*0.02)*8;
        ctx.fillStyle=`rgba(0,60,120,${0.3+Math.sin(x*0.05+frameCount*0.03)*0.1})`;
        ctx.fillRect(x,580-h,32,h+20);
    }

    // Static large ship silhouette left
    ctx.fillStyle='rgba(40,20,10,0.7)';
    ctx.fillRect(80,490,300,20); ctx.fillRect(100,480,260,12); ctx.fillRect(120,440,6,42); ctx.fillRect(180,400,4,82);
    ctx.fillStyle='rgba(30,15,8,0.5)';
    ctx.fillRect(130,440,50,42); ctx.fillRect(184,400,40,80);
    // Small ship sailing across the water
    const shipX = (frameCount * 0.6 + 100) % 1000 - 100;
    const shipBob = Math.sin(frameCount * 0.04) * 3;
    ctx.fillStyle='rgba(50,25,10,0.8)';
    ctx.fillRect(shipX, 556+shipBob, 80, 10);
    ctx.fillRect(shipX+8, 548+shipBob, 64, 10);
    ctx.fillRect(shipX+34, 520+shipBob, 3, 30);
    ctx.fillRect(shipX+50, 508+shipBob, 3, 42);
    ctx.fillStyle='rgba(240,220,180,0.4)';
    ctx.fillRect(shipX+37, 522+shipBob, 18, 18); // sail
    ctx.fillRect(shipX+53, 510+shipBob, 14, 26); // sail 2

    // Stars
    for(let i=0;i<50;i++){const sx=(i*47)%800,sy=(i*31)%300;ctx.fillStyle=`rgba(200,220,255,${(Math.sin(frameCount*0.03+i)*0.4+0.5)*0.7})`;ctx.fillRect(sx,sy,2,2);}

    ctx.textAlign='center';
    // Title
    ctx.fillStyle=PAL.swYellow; ctx.font='36px "Press Start 2P"';
    ctx.fillText('VASA', 400, 120);
    ctx.fillStyle='rgba(252,209,22,0.7)'; ctx.font='14px "Press Start 2P"';
    ctx.fillText('THE SUNKEN PRIDE', 400, 158);
    ctx.strokeStyle=PAL.swBlue; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(200,170); ctx.lineTo(600,170); ctx.stroke();
    ctx.fillStyle='#8090b0'; ctx.font='8px "Press Start 2P"';
    ctx.fillText('An Educational Adventure — Stockholm, 1628', 400, 195);

    // Swedish flag colors bar
    ctx.fillStyle=PAL.swBlue; ctx.fillRect(0,215,800,4);
    ctx.fillStyle=PAL.swYellow; ctx.fillRect(0,219,800,4);

    // Menu
    const opts=['START GAME','HOW TO PLAY'];
    opts.forEach((o,i)=>{
        const selected=titleSelection===i;
        ctx.fillStyle=selected?'rgba(0,106,167,0.4)':'rgba(0,0,0,0.3)';
        ctx.fillRect(260,340+i*60,280,44);
        ctx.strokeStyle=selected?PAL.swYellow:PAL.textBorder;
        ctx.lineWidth=selected?2:1; ctx.strokeRect(260,340+i*60,280,44);
        ctx.fillStyle=selected?PAL.swYellow:'#8090b0';
        ctx.font='10px "Press Start 2P"'; ctx.textAlign='center';
        ctx.fillText(o,400,368+i*60);
        if(selected&&Math.floor(titleBlink/15)%2===0){ctx.fillStyle=PAL.swYellow;ctx.fillText('>',248,368+i*60);}
    });

    if (titleSelection===1) {
        ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.fillRect(100,460,600,120);
        ctx.strokeStyle=PAL.swBlue; ctx.lineWidth=1; ctx.strokeRect(100,460,600,120);
        ctx.fillStyle='#c0d0e0'; ctx.font='7px "Press Start 2P"'; ctx.textAlign='left';
        ctx.fillText('Arrow Keys: Move / Select',120,480);
        ctx.fillText('SPACE / Enter: Interact / Confirm',120,496);
        ctx.fillText('[C]: Open Codex (field notes)',120,512);
        ctx.fillText('Find ★ artifacts for bonus XP + history facts',120,528);
        ctx.fillText('Combo streaks deal extra battle damage!',120,544);
        ctx.fillText('Defeat 3 quiz bosses — then reach the Archive.',120,560);
    }
    ctx.textAlign='left';
}

// ── Prologue ───────────────────────────────────────────────────────────────────
function updatePrologue() {
    prologueTimer++;
    if (prologueTextTimer < prologueScenes[prologueStep].text.length) { if(prologueTimer%2===0) prologueTextTimer++; }
    if ((keyJustPressed(' ') || keyJustPressed('Enter'))) {
        if (prologueTextTimer < prologueScenes[prologueStep].text.length) { prologueTextTimer=prologueScenes[prologueStep].text.length; return; }
        prologueStep++;
        if (prologueStep >= prologueScenes.length) { gameState='overworld'; return; }
        prologueTimer=0; prologueTextTimer=0;
    }
}

function drawPrologue() {
    const scene=prologueScenes[prologueStep];
    const bgColors = { navy:'#04080f', wood:'#1a0a04', gold:'#100a00', blue:'#040814' };
    ctx.fillStyle=bgColors[scene.bg]||'#04080f'; ctx.fillRect(0,0,800,600);

    for(let i=0;i<30;i++){const sx=(i*37+frameCount*0.3)%800,sy=(i*53)%300;ctx.fillStyle=`rgba(200,220,255,${Math.sin(frameCount*0.04+i)*0.2+0.3})`;ctx.fillRect(sx,sy,2,2);}

    ctx.fillStyle=PAL.swYellow; ctx.font='13px "Press Start 2P"'; ctx.textAlign='center';
    ctx.fillText(scene.title, 400, 200);
    ctx.strokeStyle=PAL.swBlue; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(200,215); ctx.lineTo(600,215); ctx.stroke();

    ctx.fillStyle='#c8d8f0'; ctx.font='9px "Press Start 2P"'; ctx.textAlign='left';
    wrapText(scene.text.substring(0,prologueTextTimer), 120, 260, 560, 22);

    if(prologueTextTimer>=scene.text.length&&Math.floor(frameCount/25)%2===0){
        ctx.fillStyle='#8090b0'; ctx.font='8px "Press Start 2P"'; ctx.textAlign='center';
        ctx.fillText(prologueStep<prologueScenes.length-1?'Press SPACE to continue':'Press SPACE to begin!',400,500);
    }
    ctx.fillStyle='#405060'; ctx.font='7px "Press Start 2P"'; ctx.textAlign='center';
    ctx.fillText(`${prologueStep+1} / ${prologueScenes.length}`,400,560);
    ctx.textAlign='left';
}

// ── Input ──────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

const _justPressedBuffer = {};
function keyJustPressed(key) {
    if (keys[key] && !_justPressedBuffer[key]) { _justPressedBuffer[key] = true; return true; }
    if (!keys[key]) _justPressedBuffer[key] = false;
    return false;
}

// ── Reset ──────────────────────────────────────────────────────────────────────
function resetGame() {
    const savedName = playerData.name || 'Erik';
    playerData = { x:5,y:8,dir:'down',moving:false,moveProgress:0,targetX:5,targetY:8, xp:0,level:1,hp:100,maxHp:100,wisdom:10, questionsAnswered:0,correctAnswers:0, defeatedBosses:[],currentMap:'shipyard',name:savedName,hasLogbook:false,hasBoat:false,talkedToNpcs:[] };
    battleState=null; diplomaTimer=0; diplomaPhase=0;
    titleSelection=0; prologueStep=0; prologueTimer=0; prologueTextTimer=0;
    codexOpen=false; codexPage=0;
    particles=[];
    Object.values(quizSets).forEach(set=>{
        set.questions.forEach(q=>{
            const c=q.options[q.correct];
            for(let i=q.options.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q.options[i],q.options[j]]=[q.options[j],q.options[i]];}
            q.correct=q.options.indexOf(c);
        });
    });
    maps.shipyard.tiles=generateShipyardMap();
    maps.harbor.tiles=generateHarborMap();
    maps.museum.tiles=generateMuseumMap();
    maps.archive.tiles=generateArchiveMap();
}

// ── Main Game Loop ─────────────────────────────────────────────────────────────
function update() {
    frameCount++;
    updateParticles();
    switch(gameState) {
        case 'title': updateTitle(); break;
        case 'nameEntry': break; // handled by HTML overlay
        case 'prologue': updatePrologue(); break;
        case 'overworld': updateOverworld(); break;
        case 'dialogue': updateDialogue(); break;
        case 'battleIntro': case 'battle': updateBattle(); break;
        case 'victory': break;
        case 'diploma': updateDiploma(); break;
        case 'mapTransition': updateMapTransition(); break;
        case 'slideshow': updateSlideshow(); break;
        case 'codex': updateCodex(); break;
    }
}

function draw() {
    ctx.clearRect(0,0,800,600);
    switch(gameState) {
        case 'title': drawTitle(); break;
        case 'nameEntry': drawTitle(); break; // title screen stays visible behind overlay
        case 'prologue': drawPrologue(); break;
        case 'overworld': drawOverworld(); break;
        case 'dialogue': drawOverworld(); drawDialogue(); break;
        case 'battleIntro': case 'battle': drawBattle(); break;
        case 'victory': drawVictory(); break;
        case 'diploma': drawDiploma(); break;
        case 'mapTransition': drawMapTransition(); break;
        case 'slideshow': drawSlideshow(); break;
        case 'codex': drawCodex(); break;
    }
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
gameLoop();
