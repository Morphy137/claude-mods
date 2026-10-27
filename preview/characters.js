// Anime-inspired cosmetics for the Claude critter (12x14 grid: body rows 6-11 x2-9,
// arms rows 8-9 x0-1 and x10-11, legs rows 12-13, eyes at (3,7) and (8,7)).
// A part is { rows: { y: pattern }, colors: { letter: hex } }; '.' leaves what is below.

const part = (rows, colors) => ({ rows, colors })

// Hair shapes: H is the main color, h the second tone.
const HAIR = {
  messy:     { 3: '...HHHHHH...', 4: '..HHHHHHHH..', 5: '..HHHHHHHH..', 6: '..H.HH.H.H..' },
  spiky:     { 1: '....H...H...', 2: '...HH.HHH...', 3: '.HHHHHHHHHH.', 4: 'H.HHHHHHHH.H', 5: '..HHHHHHHH..', 6: '...H.HH.H...' },
  spikyUp:   { 0: '.....HH.....', 1: '...H.HH.H...', 2: '..HH.HH.HH..', 3: '..HHHHHHHH..', 4: '..HHHHHHHH..', 5: '..HHHHHHHH..', 6: '..H.H..H.H..' },
  bigSpiky:  { 1: '..H..H.H..H.', 2: '..HH.HHH.HH.', 3: '.HHHHHHHHHH.', 4: '.HHHHHHHHHH.', 5: '..HHHHHHHH..', 6: '..H.H..H.H..' },
  naruto:    { 1: '....H..H....', 2: '..H.HHHH.H..', 3: '.HHHHHHHHHH.', 4: '..HHHHHHHH..', 5: '..HHHHHHHH..', 6: '...H....H...' },
  bowl:      { 3: '...HHHHHH...', 4: '..HHHHHHHH..', 5: '..HHHHHHHH..', 6: '..HHHHHHHH..' },
  bob:       { 3: '...HHHHHH...', 4: '..HHHHHHHH..', 5: '.HHHHHHHHHH.', 6: '.HH.H..H.HH.', 7: '.H........H.', 8: '.H........H.' },
  long:      { 3: '...HHHHHH...', 4: '..HHHHHHHH..', 5: '.HHHHHHHHHH.', 6: '.HH.H..H.HH.', 7: '.H........H.', 8: '.H........H.', 9: '.H........H.', 10: '.H........H.', 11: '.H........H.' },
  pineapple: { 0: '....H.H.....', 1: '.....HH.....', 2: '.....HH.....', 3: '...HHHHHH...', 4: '..HHHHHHHH..', 5: '..HHHHHHHH..', 6: '..H......H..' },
  pony:      { 3: '...HHHHHH...', 4: '..HHHHHHHH..', 5: '..HHHHHHHHH.', 6: '..H.H..H.HHH', 7: '..........HH', 8: '...........H' },
  twintails: { 3: '...HHHHHH...', 4: '..HHHHHHHH..', 5: '..HHHHHHHH..', 6: '.HH.H..H.HH.', 7: 'HH........HH', 8: 'H..........H', 9: 'H..........H' },
  undercut:  { 3: '...HHHHHH...', 4: '..HHHHHHHH..', 5: '..HHH..HHH..', 6: '..HH....HH..' },
  slick:     { 2: '...HHHHHH...', 3: '..HHHHHHHH..', 4: '..HHHHHHHH..', 5: '..HH....HH..' },
  sweep:     { 1: '.......HH...', 2: '......HHH...', 3: '....HHHHHH..', 4: '..HHHHHHHH..', 5: '..HHHHHHHH..' },
  sasuke:    { 2: '.........H..', 3: '...HHHHHHHH.', 4: '..HHHHHHHHHH', 5: '..HHHHHHHHH.', 6: '..HH.H..H.H.' },
  fluffy:    { 2: '...H.HH.H...', 3: '..HHHHHHHH..', 4: '.HHHHHHHHHH.', 5: '.HHHHHHHHHH.', 6: '..HH.HH.HH..' },
  afro:      { 0: '...HHHHHH...', 1: '.HHHHHHHHHH.', 2: 'HHHHHHHHHHHH', 3: 'HHHHHHHHHHHH', 4: 'HHHHHHHHHHHH', 5: '.HHHHHHHHHH.', 6: '.HH......HH.' },
  pompadour: { 1: '....HHHHHH..', 2: '...HHHHHHHH.', 3: '..HHHHHHHHH.', 4: '..HHHHHHHH..', 5: '..HHHHHHHH..' },
  flame:     { 1: '..h.h..h.h..', 2: '.hHhHhhHhHh.', 3: '.HHHHHHHHHH.', 4: '..HHHHHHHH..', 5: '..HHHHHHHH..', 6: '..H.H..H.H..' },
  longSpiky: { 2: '..H.H..H.H..', 3: '.HHHHHHHHHH.', 4: 'HHHHHHHHHHHH', 5: 'HHHHHHHHHHHH', 6: 'HH........HH', 7: 'HH........HH', 8: 'H..........H', 9: 'H..........H' },
  widow:     { 0: '.....HH.....', 1: '....HHHH....', 2: '...HHHHHH...', 3: '..HHHHHHHH..', 4: '..HHHHHHHH..', 5: '..H..HH..H..', 6: '.....HH.....' },
  curly:     { 3: '..H.HHHH.H..', 4: '..HHHHHHHH..', 5: '.HHHHHHHHHH.', 6: '..H.HH.H.H..' },
  twoTone:   { 3: '...HHHhhh...', 4: '..HHHHhhhh..', 5: '..HHHHhhhh..', 6: '..H.H..h.h..' },
  bun:       { 1: '.....HH.....', 2: '....HHHH....', 3: '.....HH.....', 4: '..HHHHHHHH..', 5: '..HHHHHHHH..', 6: '..H......H..' },
  odango:    { 2: '.HH......HH.', 3: 'HHH.HHHH.HHH', 4: 'H.HHHHHHHH.H', 5: 'H.HHHHHHHH.H', 6: 'H.H.H..H.H.H', 7: 'H..........H', 8: 'H..........H', 9: 'H..........H', 10: 'H..........H' },
  braid:     { 2: '.....H......', 3: '...HHHHHH...', 4: '..HHHHHHHH..', 5: '..HHHHHHHH..', 6: '..H.HH.H.HH.', 7: '..........H.', 8: '...........H' },
  coverEye:  { 3: '...HHHHHH...', 4: '..HHHHHHHH..', 5: '..HHHHHHHH..', 6: '..HHHHH..H..', 7: '..HH........' },
  hornHair:  { 3: '..H......H..', 4: '..HH....HH..', 5: '..HHHHHHHH..', 6: '..H.H..H.H..' },
  topknot:   { 1: '.....HH.....', 2: '....H..H....', 3: '.....HH.....', 4: '...HHHHHH...', 5: '..HH....HH..' },
  short:     { 4: '..HHHHHHHH..', 5: '..HHHHHHHH..', 6: '..H......H..' },
  coverRight:{ 3: '...HHHHHH...', 4: '..HHHHHHHH..', 5: '..HHHHHHHH..', 6: '..H..HHHHH..', 7: '........HH..' },
  strand:    { 3: '...HHHHHH...', 4: '..HHHHHHHH..', 5: '..HHHHHHHH..', 6: '..H..HH..H..', 7: '.....H......' },
}

function shadeOf(hex, amount) {
  const n = parseInt(hex.slice(1), 16)
  const mix = c => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(mix).map(c => c.toString(16).padStart(2, '0')).join('')
}

const hair = (style, color, second = shadeOf(color, -0.3)) => part(HAIR[style], { H: color, h: second })

// Colors reused across characters.
const BLACK = '#1b1b1f', WHITE = '#f4f4f6', SILVER = '#d4d8e2', BLOND = '#fbbf24', BROWN = '#6b3e22', RED = '#dc2626'
const GOLD = '#eab308', NAVY = '#1e3a8a', PLATE = '#cbd5e1', GRAY = '#9ca3af', SKIN = '#f6d3b8'

// Headwear.
const straw = () => part({ 2: '...tttttt...', 3: '..tttttttt..', 4: '..rrrrrrrr..', 5: 'tttttttttttt' }, { t: GOLD, r: RED })
const headband = (cloth = NAVY, plate = PLATE) => part({ 5: '.bbbbssbbbb.' }, { b: cloth, s: plate })
const band = c => part({ 5: '..cccccccc..' }, { c })
const bandana = c => part({ 3: '...cccccc...', 4: '..cccccccc..', 5: '..ccccccccc.', 6: '..........cc' }, { c })
const captain = (c, trim = GOLD) => part({ 2: '....cccc....', 3: '..cccccccc..', 4: '.ccttttttcc.', 5: 'cccccccccccc' }, { c, t: trim })
const cowboy = (c, b = RED) => part({ 2: '...cccccc...', 3: '...cccccc...', 4: 'c..bbbbbb..c', 5: 'cccccccccccc' }, { c, b })
const bucket = (c, s) => part({ 3: '...cccccc...', 4: '..cscscscs..', 5: '.cccccccccc.' }, { c, s })
const witch = (c, b) => part({ 0: '......c.....', 1: '.....cc.....', 2: '....ccc.....', 3: '....cccc....', 4: '...bbbbbb...', 5: '.cccccccccc.' }, { c, b })
const kage = () => part({ 2: '.....rr.....', 3: '....wrrw....', 4: '...wwwwww...', 5: '.wwwwwwwwww.' }, { w: WHITE, r: RED })
const tophat = (c, b) => part({ 0: '...cccccc...', 1: '...cccccc...', 2: '...cccccc...', 3: '...bbbbbb...', 4: '...cccccc...', 5: '.cccccccccc.' }, { c, b })
const furhat = () => part({ 3: '...wwwwww...', 4: '..wkwwwkww..', 5: '..wwwkwwww..' }, { w: WHITE, k: '#78350f' })
const chopperHat = () => part({ 0: '.a........a.', 1: '.aa......aa.', 2: '..a.pppp.a..', 3: '..pppbbppp..', 4: '..pppppppp..', 5: '..wwwwwwww..' }, { a: '#92400e', p: '#f472b6', b: '#2563eb', w: WHITE })
const plumed = (c, f) => part({ 3: '....cccc..f.', 4: '...cccccc.f.', 5: '.cccccccccc.' }, { c, f })
const fedora = (c, b) => part({ 2: '....cccc....', 3: '...cccccc...', 4: '...bbbbbb...', 5: '.cccccccccc.' }, { c, b })
const deerstalker = (c, s) => part({ 3: '...cscscc...', 4: '..cscscscs..', 5: '.scccccccs..', 6: '..c......c..' }, { c, s })
const flatcap = c => part({ 3: '...cccccc...', 4: '..cccccccc..', 5: '..cccccccccc' }, { c })
const cap = (front, back, logo) => part({ 3: '...ffbbbb...', 4: '..ffgfbbbb..', 5: '..bbbbbbbbbb' }, { f: front, b: back, g: logo })
const aviator = c => part({ 3: '...cccccc...', 4: '..cccccccc..', 5: '..gllggllg..', 6: '..c......c..' }, { c, g: '#374151', l: '#7dd3fc' })
const boar = () => part({ 2: '..g......g..', 3: '..gg....gg..', 4: '.gggggggggg.', 5: '.gggggggggg.', 6: '..gggggggg..', 7: '..gkggggkg..', 8: '...gppppg...' }, { g: '#6b7280', k: '#111111', p: '#f9a8d4' })
const armorHelmet = () => part({ 1: '.....gg.....', 2: '.....gg.....', 3: '...gggggg...', 4: '..gggggggg..', 5: '..gGGGGGGg..', 6: '..g......g..' }, { g: '#9ca3af', G: '#6b7280' })
const domeCap = c => part({ 3: '...cccccc...', 4: '..cccccccc..', 5: '..cccccccc..' }, { c })
const turban = () => part({ 3: '...wwwwww...', 4: '..wwwwwwww..', 5: '..pppppppp..' }, { w: WHITE, p: '#7c3aed' })
const chainsawHead = () => part({ 0: '.....gg.....', 1: '....gggg....', 2: '....gkkg....', 3: '....gggg....', 4: '...oooooo...', 5: '..oooooooo..' }, { g: '#d1d5db', k: '#4b5563', o: '#f97316' })
const crownWings = () => part({ 2: '..k......k..', 3: '..kk....kk..', 4: '...kk..kk...', 5: '...kkkkkk...' }, { k: '#1f2937' })
const maidBand = () => part({ 4: '..wkwkwkwk..' }, { w: WHITE, k: BLACK })
const kenseikan = () => part({ 4: '..w......w..', 5: '..w......w..' }, { w: WHITE })
const bow = c => part({ 1: '...c....c...', 2: '...cc..cc...', 3: '....cccc....' }, { c })
const topBow = c => part({ 2: '....cc.cc...', 3: '.....ccc....' }, { c })
const hairpin = (c, x = 8) => part({ 4: '.'.repeat(x) + 'cc' + '.'.repeat(10 - x), 5: '.'.repeat(x - 1) + 'cccc' + '.'.repeat(9 - x) }, { c })
const clips = c => part({ 4: '..c......c..' }, { c })
const hornClips = () => part({ 3: '..k......k..', 4: '..kk....kk..' }, { k: BLACK })
const elfEars = () => part({ 6: 'e..........e', 7: '.e........e.' }, { e: '#d94a36' })
const animalEars = c => part({ 2: '..c......c..', 3: '..cc....cc..' }, { c })
const longEars = () => part({ 0: 'kk........kk', 1: '.ky......yk.', 2: '..yy....yy..', 3: '..yy....yy..', 4: '...yy..yy...', 5: '...yy..yy...' }, { k: BLACK, y: '#facc15' })
const horns = c => part({ 4: '..c......c..', 5: '..cc....cc..' }, { c })
const bigHorns = c => part({ 1: '.c........c.', 2: '.cc......cc.', 3: '..cc....cc..' }, { c })
const antenna = c => part({ 1: '...c....c...', 2: '....c..c....', 3: '....c..c....', 4: '....c..c....', 5: '....c..c....' }, { c })
const limiters = () => part({ 2: '..k......k..', 3: '..k......k..', 4: '..k......k..' }, { k: BLACK })
const tiara = (gem = RED) => part({ 5: '..gggrrggg..' }, { g: GOLD, r: gem })
const gems = () => part({ 5: '..grgbgrgb..' }, { g: GOLD, r: RED, b: '#38bdf8' })
const roses = () => part({ 5: '..ryryryry..' }, { r: '#be123c', y: GOLD })
const bellTips = () => part({ 1: '..y..y.y..y.' }, { y: GOLD })

// Face.
const blindfold = () => part({ 7: '.kkkkkkkkkk.' }, { k: '#111111' })
const glasses = (c = '#1f2937') => part({ 7: '..c.cccc.c..' }, { c })
const shades = (c = '#111111') => part({ 7: '..cccccccc..' }, { c })
const pointyShades = c => part({ 6: '.c........c.', 7: '..cccccccc..' }, { c })
const goggles = (c = '#374151', l = '#7dd3fc') => part({ 5: '.ccllccllcc.' }, { c, l })
const neckGoggles = () => part({ 8: '..cllcclllc.' }, { c: '#374151', l: '#fde047' })
const eyepatch = (c = '#111111') => part({ 6: '..cccccccc..', 7: '..cc........' }, { c })
const rightPatch = (c = '#111111') => part({ 7: '.......cc...' }, { c })
const coverLeftEye = c => part({ 6: '..cc........', 7: '..cc........' }, { c })
const crescent = () => part({ 7: '.w........w.', 8: '..ww....ww..' }, { w: WHITE })
const beard = c => part({ 8: '...cccccc...', 9: '...cccccc...', 10: '....cccc....', 11: '.....cc.....' }, { c })
const mustache = c => part({ 8: '...cc..cc...' }, { c })
const goatee = c => part({ 9: '.....cc.....' }, { c })
const scar = (c = '#7f1d1d') => part({ 8: '...c........' }, { c })
const eyeScars = (c = '#7f1d1d') => part({ 6: '....c.......', 7: '....c.......', 8: '....c.......' }, { c })
const crossScar = (c = '#7f1d1d') => part({ 9: '....c.c.....', 10: '.....c......' }, { c })
const underEyes = c => part({ 8: '...c....c...' }, { c })
const freckles = () => part({ 8: '..f.f..f.f..' }, { f: '#9a3412' })
const blush = () => part({ 8: '..f......f..' }, { f: '#f9a8d4' })
const grin = (c = WHITE) => part({ 8: '....cccc....' }, { c })
const redNose = () => part({ 8: '.....rr.....' }, { r: RED })
const dotNose = c => part({ 8: '.....cc.....' }, { c })
const longNose = () => part({ 8: '.....nnnn...' }, { n: '#c2410c' })
const cigar = () => part({ 8: '.........ww.', 7: '..........g.' }, { w: '#f5f5f4', g: GRAY })
const starTear = () => part({ 8: '..y......b..' }, { y: '#facc15', b: '#38bdf8' })
const piercings = () => part({ 8: '..s.s..s.s..', 6: '...s....s...' }, { s: '#9ca3af' })
const foreheadMark = (c, x = 5, w = 2) => part({ 6: '.'.repeat(x) + 'c'.repeat(w) + '.'.repeat(12 - x - w) }, { c })
const dots6 = () => part({ 5: '...k.k.k....', 6: '....k.k.k...' }, { k: '#111111' })
const maskLower = c => part({ 8: '..cccccccc..' }, { c })
const swirlMask = () => part({ 6: '..oooooooo..', 7: '..oooooo.o..', 8: '..oooooooo..' }, { o: '#f97316' })
const zipperMask = () => part({ 8: '..kwkwkwkw..' }, { k: '#111111', w: WHITE })
const brows = c => part({ 6: '..ccc..ccc..' }, { c })
const curlyBrow = () => part({ 6: '.......kk...' }, { k: '#111111' })
const shadowEyes = () => part({ 6: '..kk....kk..' }, { k: '#4c1d95' })

// Outfits.
const tie = c => part({ 8: '.....cc.....', 9: '.....cc.....', 10: '....cccc....' }, { c })
const bowtie = c => part({ 8: '....cccc....' }, { c })
const scarf = c => part({ 8: '..cccccccc..', 9: '........c...', 10: '........c...' }, { c })
const highCollar = c => part({ 8: '..cccccccc..', 9: '..cccccccc..' }, { c })
const cape = (c, edge = c) => part({ 10: 'cc........cc', 11: 'cc........cc', 12: 'c..........c', 13: 'e..........e' }, { c, e: edge })
const cloak = (c, r = RED) => part({ 8: 'cccccccccccc', 9: 'cccrrccccccc', 10: '..cccccrrc..', 11: '..cccccccc..' }, { c, r })
const haori = (a, b) => part({ 8: 'abab....baba', 9: 'baba....abab', 10: '..ab....ba..', 11: '..ba....ab..' }, { a, b })
const halfHaori = () => part({ 8: 'rrrr....gygy', 9: 'rrrr....ygyg', 10: '..rr....gy..', 11: '..rr....yg..' }, { r: '#b91c1c', g: '#15803d', y: '#ca8a04' })
const vest = c => part({ 8: '..cc....cc..', 9: '..cc....cc..', 10: '..cc....cc..', 11: '..cc....cc..' }, { c })
const labcoat = () => part({ 8: 'wwg......gww', 9: 'wwg......gww', 10: '..g......g..', 11: '..w......w..' }, { w: '#f1f5f9', g: '#cbd5e1' })
const suit = (c, shirt = WHITE) => part({ 8: 'cc.ccssc.cc.', 9: 'cc.cssssc.cc', 10: '..cc....cc..', 11: '..cc....cc..' }, { c, s: shirt })
const robe = c => part({ 8: 'cc.c....c.cc', 9: 'cc.cc..cc.cc', 10: '..cccccccc..', 11: '..cccccccc..' }, { c })
const jumpsuit = c => part({ 8: 'cccccccccccc', 9: 'cccccccccccc', 10: '..cccccccc..', 11: '..cccccccc..' }, { c })
const arms = c => part({ 8: 'cc........cc', 9: 'cc........cc' }, { c })
const rightArm = c => part({ 8: '..........cc', 9: '..........cc' }, { c })
const legs = c => part({ 12: '..c.c..c.c..', 13: '..c.c..c.c..' }, { c })
const belt = (c, b = GOLD) => part({ 10: '..cccbbccc..' }, { c, b })
const necklace = c => part({ 8: '...c.cc.c...' }, { c })
const brooch = c => part({ 8: '.....cc.....' }, { c })
const sailor = (c, b = RED) => part({ 8: '..cccbbccc..' }, { c, b })
const shoulderArmor = (c, s) => part({ 8: 'sscccccccccs', 9: 's.cccccccc.s' }, { c, s })
const apron = () => part({ 8: '...w....w...', 9: '...wwwwww...', 10: '...wwwwww...', 11: '...wwwwww...' }, { w: WHITE })
const letterChest = (c, bg = WHITE) => part({ 9: '....bccb....' }, { c, b: bg })
const fireHem = () => part({ 13: 'r..........r' }, { r: '#f97316' })

// Held props (right hand reaches up at x10-11, left at x0-1).
const swords = () => part({ 10: '..........hh', 11: '..........ss', 12: '..........ss', 13: '..........ss' }, { h: '#111111', s: GRAY })
const katana = (blade = GRAY, hilt = '#111111') => part({ 2: '...........b', 3: '...........b', 4: '...........b', 5: '...........b', 6: '..........hh', 7: '...........h' }, { b: blade, h: hilt })
const bigBlade = () => part({ 1: '..........kk', 2: '..........kk', 3: '..........kk', 4: '..........kk', 5: '..........kk', 6: '...........w', 7: '...........w' }, { k: '#111111', w: WHITE })
const staff = c => part({ 2: '...........c', 3: '...........c', 4: '...........c', 5: '...........c', 6: '...........c', 7: '...........c' }, { c })
const gourd = () => part({ 2: '.........gg.', 3: '........gggg', 4: '........gggg', 5: '.........gg.' }, { g: '#c2a26b' })
const hammer = () => part({ 3: '.........ggg', 4: '.........ggg', 5: '..........s.', 6: '..........s.', 7: '..........s.' }, { g: GRAY, s: '#92400e' })
const wrench = () => part({ 3: '.........g.g', 4: '.........ggg', 5: '..........g.', 6: '..........g.', 7: '...........g' }, { g: GRAY })
const flask = c => part({ 4: '..........w.', 5: '.........wcw', 6: '.........ccc' }, { w: '#e0f2fe', c })
const book = c => part({ 6: 'cw..........', 7: 'cw..........' }, { c, w: WHITE })
const fan = () => part({ 5: '.........www', 6: '.........www', 7: '..........k.' }, { w: WHITE, k: '#111111' })
const drill = () => part({ 2: '...........g', 3: '..........gg', 4: '.........ggg', 5: '..........gg', 6: '...........g' }, { g: '#9ca3af' })
const rose = () => part({ 4: '..........rr', 5: '..........rr', 6: '...........g', 7: '...........g' }, { r: '#e11d48', g: '#16a34a' })
const bolt = () => part({ 3: '..........y.', 4: '.........yy.', 5: '..........yy', 6: '..........y.' }, { y: '#facc15' })
const fishingRod = () => part({ 0: '...........s', 1: '...........s', 2: '...........s', 3: '...........s', 4: '...........s', 5: '...........s', 6: '...........s', 7: '...........s' }, { s: '#a16207' })
const nimbus = () => part({ 12: 'yyyyyyyyyyyy', 13: '.yyyyyyyyyy.' }, { y: '#fde047' })
const broom = () => part({ 4: '...........s', 5: '...........s', 6: '...........s', 7: '..........yy' }, { s: '#92400e', y: '#ca8a04' })
const nails = () => part({ 6: 'gg..........', 7: 'g.g.........' }, { g: GRAY })
const robotToy = () => part({ 6: 'gg..........', 7: 'gg..........' }, { g: '#60a5fa' })
const balance = () => part({ 4: '.........ggg', 5: '..........g.', 6: '..........g.' }, { g: GOLD })

// Body-shaped characters: belly, ears and tails painted over a recolored critter.
const belly = (c, rows = { 9: '...cccccc...', 10: '...cccccc...', 11: '....cccc....' }) => part(rows, { c })
const flameTail = () => part({ 10: '...........y', 11: '..........or', 12: '..........o.' }, { y: '#facc15', r: '#ef4444', o: '#f2604a' })
const pointyEars = c => part({ 3: '..c......c..', 4: '..cc....cc..', 5: '..cc....cc..' }, { c })

// Each category lists 10 characters: { name, parts, body?, eyes? }.
// body recolors the critter; eyes recolors the eye pixels (only where they must contrast with the body).
const ANIME_CATEGORIES = [
  { id: 'ORC', name: 'Orchestrator', color: '#2563eb', characters: [
    { name: 'Luffy', parts: [hair('messy', BLACK), straw(), scar()] },
    { name: 'Gojo', parts: [hair('spiky', WHITE), blindfold()] },
    { name: 'Barbablanca', parts: [bandana(BLACK), crescent(), cape(WHITE)] },
    { name: 'Shanks', parts: [hair('messy', '#b91c1c'), eyeScars(), cape(BLACK)] },
    { name: 'Alucard', parts: [part({ 6: '.k........k.', 7: '.k........k.', 8: '.k........k.' }, { k: BLACK }), part({ 2: '...rrrrrr...', 3: '...rrrrrr...', 4: '...bbbbbb...', 5: 'rrrrrrrrrrrr' }, { r: '#b91c1c', b: '#450a0a' }), part({ 7: '..oo....oo..' }, { o: '#f97316' }), cape('#b91c1c')] },
    { name: 'Dio', parts: [hair('messy', '#fde047'), part({ 5: '..gggppggg..' }, { g: '#16a34a', p: '#f472b6' }), jumpsuit('#eab308')] },
    { name: 'Lelouch', parts: [hair('messy', BLACK), cape('#4c1d95', GOLD)], eyes: '#dc2626' },
    { name: 'Minato', parts: [hair('naruto', '#facc15'), headband(), cape(WHITE), fireHem()] },
    { name: 'Vegeta', parts: [hair('widow', BLACK), part({ 8: 'yywwwwwwwwyy', 9: 'bbwwwwwwwwbb', 10: '..bbbbbbbb..', 11: '..bbbbbbbb..' }, { y: '#facc15', w: WHITE, b: '#1d4ed8' }), legs(WHITE)] },
    { name: 'Byakuya', parts: [hair('long', BLACK), kenseikan(), scarf(SILVER)] },
  ] },
  { id: 'ARC', name: 'Architect', color: '#8b5cf6', characters: [
    { name: 'Hatsune Miku', parts: [jumpsuit('#9ca3af'), tie('#2dd4bf'), hair('twintails', '#2dd4bf'), part({ 10: 'H..........H', 11: 'H..........H', 12: 'H..........H' }, { H: '#2dd4bf' }), part({ 6: '.r........r.' }, { r: '#ec4899' })] },
    { name: 'L', parts: [hair('fluffy', BLACK), underEyes('#6b7280')] },
    { name: 'Jotaro', parts: [part({ 3: '...kkkkkk...', 4: '..kkkkkkkk..', 5: '..kkkykkkkkk', 6: '..k......k..' }, { k: '#111827', y: GOLD }), part({ 8: 'cc.cc..cc.cc', 9: 'cc.c....c.cc', 10: '..cc....cc..', 11: '..cc....cc..' }, { c: '#1e293b' }), part({ 9: '.......yy...' }, { y: GOLD })] },
    { name: 'Armin', parts: [hair('bob', '#fde68a'), cape('#166534')] },
    { name: 'Ainz', parts: [part({ 4: '..g......g..', 5: '..gg.gg.gg..' }, { g: GOLD }), part({ 8: 'pppppppppppp', 9: 'ppgpprrppgpp', 10: '..pppppppp..', 11: '..pggppggp..' }, { p: '#3b0764', g: GOLD, r: '#dc2626' })], body: '#e7e5e4' },
    { name: 'Doraemon', parts: [part({ 7: '....wwww....', 8: '...wwrrww...', 9: '...wwwwww...', 10: '..rrryyrrr..', 11: '...wwwwww...' }, { w: WHITE, r: RED, y: '#facc15' })], body: '#0ea5e9' },
    { name: 'Kakashi', parts: [hair('sweep', SILVER), headband(), coverLeftEye(NAVY), maskLower('#334155')] },
    { name: 'Yugi', parts: [jumpsuit('#1e3a8a'), part({ 0: '.m...mm...m.', 1: '.km.mkkm.mk.', 2: 'kkkkkkkkkkkk', 3: '.kkkkkkkkkk.', 4: '..kkkkkkkk..', 5: '..yyykkyyy..', 6: '..y.y..y.y..' }, { k: BLACK, m: '#c026d3', y: '#fde047' }), part({ 9: '.....yy.....', 10: '....yyyy....' }, { y: GOLD })] },
    { name: 'Shin-chan', parts: [hair('short', BLACK), brows(BLACK), jumpsuit(RED), part({ 11: '..yyyyyyyy..' }, { y: '#facc15' })] },
    { name: 'Meowth', parts: [part({ 3: '..cc....cc..', 4: '..cb....bc..', 5: '..cc.yy.cc..', 6: '.....yy.....' }, { c: '#fef3c7', b: '#1f2937', y: '#facc15' }), part({ 8: '.k........k.' }, { k: '#1f2937' }), part({ 10: '..........b.', 11: '...........b', 12: '..........bb' }, { b: '#92400e' })], body: '#fef3c7' },
  ] },
  { id: 'INS', name: 'Inspector', color: '#14b8a6', characters: [
    { name: 'Conan', parts: [hair('messy', '#3f2a14'), part({ 2: '......h.....' }, { h: '#3f2a14' }), jumpsuit('#1d4ed8'), bowtie(RED), part({ 6: '..kkk..kkk..', 7: '..k.k..k.k..', 8: '..kkk..kkk..' }, { k: '#111111' })] },
    { name: 'Levi', parts: [hair('undercut', BLACK), bowtie(WHITE), cape('#166534')] },
    { name: 'Vash', parts: [part({ 0: '.....yy.....', 1: '....yyyy....', 2: '...yyyyyy...', 3: '..yyyyyyyy..', 4: '..yyyyyyyy..', 5: '..y.yyyy.y..' }, { y: '#fde047' }), jumpsuit('#dc2626'), part({ 7: '..oo....oo..' }, { o: '#f97316' }), belt(BLACK, BLACK)] },
    { name: 'Hinata Hyuga', parts: [hair('long', '#1e1b4b')], eyes: '#c4b5fd' },
    { name: 'Sasuke', parts: [hair('sasuke', BLACK), headband()], eyes: '#dc2626' },
    { name: 'Inuyasha', parts: [jumpsuit('#b91c1c'), hair('long', '#e5e7eb'), animalEars('#e5e7eb'), necklace('#7c3aed')] },
    { name: 'Totoro', parts: [pointyEars('#6b7280'), belly('#f5f5dc', { 9: '...cccccc...', 10: '..cccccccc..', 11: '..cccccccc..' }), part({ 10: '....k..k....' }, { k: '#4b5563' })], body: '#6b7280' },
    { name: 'Sesshomaru', parts: [jumpsuit('#f1f5f9'), hair('long', '#e5e7eb'), part({ 6: '.....pp.....', 8: '..m......m..' }, { p: '#7c3aed', m: '#db2777' }), part({ 8: '..........ww', 9: '..........ww', 10: '.........ww.' }, { w: '#cbd5e1' })] },
    { name: 'Aizawa', parts: [hair('long', BLACK), neckGoggles(), scarf(GRAY)] },
    { name: 'Saiki', parts: [jumpsuit('#2563eb'), hair('short', '#f472b6'), part({ 1: '...k....k...', 2: '...k....k...', 3: '..kk....kk..' }, { k: '#111111' }), part({ 7: '..gg....gg..' }, { g: '#4ade80' })] },
  ] },
  { id: 'GUA', name: 'Guardian', color: '#ef4444', characters: [
    { name: 'Zoro', parts: [hair('short', '#22c55e'), part({ 7: '.y..........' }, { y: GOLD }), belt('#15803d', '#15803d'), swords()] },
    { name: 'Itachi', parts: [hair('long', BLACK), headband(NAVY), cloak('#111827')], eyes: '#dc2626' },
    { name: 'Gaara', parts: [hair('messy', '#b91c1c'), foreheadMark(RED, 3, 1), gourd()] },
    { name: 'Alphonse', parts: [armorHelmet(), belt('#78350f', '#78350f')], body: '#9ca3af', eyes: '#fde047' },
    { name: 'Mikasa', parts: [hair('bob', BLACK), scarf(RED)] },
    { name: 'Kenpachi', parts: [hair('bigSpiky', BLACK), bellTips(), rightPatch(), robe(WHITE)] },
    { name: 'Rengoku', parts: [hair('flame', '#facc15', '#dc2626'), cape(WHITE), fireHem()] },
    { name: 'Giyu', parts: [hair('pony', BLACK), halfHaori()] },
    { name: 'Ichigo', parts: [hair('bigSpiky', '#f97316'), robe(BLACK), bigBlade()] },
    { name: 'Kirishima', parts: [hair('bigSpiky', '#dc2626'), grin(), arms('#6b7280')] },
  ] },
  { id: 'TES', name: 'Tester', color: '#22c55e', characters: [
    { name: 'Senku', parts: [hair('spikyUp', '#d9f99d', '#65a30d'), labcoat(), flask('#22c55e')] },
    { name: 'Hange', parts: [hair('pony', '#7c4a1e'), goggles(), flask('#a855f7')] },
    { name: 'Bulma', parts: [hair('pony', '#22d3ee'), topBow(RED), wrench()] },
    { name: 'Orochimaru', parts: [hair('long', BLACK), shadowEyes(), belt('#7c3aed', '#7c3aed')], eyes: '#facc15' },
    { name: 'Okabe', parts: [hair('messy', BLACK), labcoat(), goatee('#1f2937')] },
    { name: 'Chopper', parts: [chopperHat(), dotNose('#2563eb')], body: '#a0522d' },
    { name: 'Mayuri', parts: [part({ 2: '..y......y..', 3: '..yy....yy..', 4: '...yyyyyy...', 5: '..kkkkkkkk..' }, { y: GOLD, k: '#111111' }), part({ 8: '..kkkkkkkk..' }, { k: '#111111' })], body: '#f1f5f9' },
    { name: 'Edward Elric', parts: [hair('braid', '#facc15'), cape(RED), rightArm('#9ca3af')] },
    { name: 'Shinobu', parts: [hair('bob', BLACK, '#7c3aed'), hairpin('#a855f7'), haori('#f5f3ff', '#a855f7')] },
    { name: 'Kurisu', parts: [hair('long', '#b45309'), labcoat(), tie(RED)] },
  ] },
  { id: 'DEB', name: 'Debugger', color: '#a8794a', characters: [
    { name: 'Gintoki', parts: [jumpsuit('#1f2937'), part({ 8: 'ww.w........', 9: 'bw.w........', 10: '..ww........', 11: '..wb........' }, { w: '#f8fafc', b: '#38bdf8' }), hair('fluffy', '#cbd5e1'), staff('#a16207')] },
    { name: 'Ranma', parts: [jumpsuit('#dc2626'), part({ 9: '.....yy.....', 10: '.....yy.....' }, { y: GOLD }), legs(BLACK), hair('braid', BLACK)] },
    { name: 'Bocchi', parts: [jumpsuit('#fbcfe8'), hair('long', '#f9a8d4'), part({ 4: '..yb........' }, { y: '#facc15', b: '#3b82f6' })] },
    { name: 'Usopp', parts: [hair('curly', BLACK), longNose(), goggles('#92400e', '#fde047')] },
    { name: 'Kaneki', parts: [jumpsuit('#111827'), hair('messy', '#e5e7eb'), part({ 7: '.......kkk..', 8: '..kwkwkwkk..' }, { k: '#111111', w: WHITE })] },
    { name: 'Detective Pikachu', parts: [longEars(), deerstalker('#92400e', '#78350f'), part({ 8: '..r......r..' }, { r: '#ef4444' })], body: '#facc15' },
    { name: 'Sin Cara', parts: [part({ 6: '...pwwwwp...', 7: '...kwwwwk...', 8: '...pwwwwp...', 9: '....wwww....', 10: '.....ww.....' }, { w: '#f5f5f4', k: '#111111', p: '#7c3aed' })], body: '#111111' },
    { name: 'Gengar', parts: [part({ 3: '..p.p..p.p..', 4: '..pppppppp..', 5: '..pppppppp..' }, { p: '#7c3aed' }), grin()], body: '#7c3aed' },
    { name: 'Psyduck', parts: [part({ 3: '....k.k.k...', 4: '.....k.k....' }, { k: '#111111' }), part({ 8: '....bbbb....' }, { b: '#fcd9a8' })], body: '#fde047' },
    { name: 'Squirtle', parts: [part({ 8: '..b......b..', 9: '..byyyyyyb..', 10: '..byyyyyyb..', 11: '..bbbbbbbb..' }, { b: '#a16207', y: '#fde68a' }), part({ 11: '..........cc', 12: '...........c' }, { c: '#7dd3fc' })], body: '#7dd3fc' },
  ] },
  { id: 'RES', name: 'Researcher', color: '#6366f1', characters: [
    { name: 'Robin', parts: [hair('long', BLACK), goggles('#111111', '#374151'), book('#7c3aed')] },
    { name: 'Frieren', parts: [jumpsuit('#f8fafc'), belt(GOLD, GOLD), hair('twintails', '#e2e8f0'), elfEars()] },
    { name: 'Sailor Mercury', parts: [jumpsuit('#f8fafc'), hair('short', '#3b82f6'), tiara('#38bdf8'), sailor('#1d4ed8', '#38bdf8')] },
    { name: 'Maestro Roshi', parts: [jumpsuit('#dc2626'), part({ 9: '..y..y..y...', 11: '....y..y..y.' }, { y: '#facc15' }), beard(WHITE), mustache(WHITE), shades(), part({ 6: '...w........' }, { w: WHITE }), staff('#92400e')] },
    { name: 'Urahara', parts: [hair('messy', '#fde68a'), bucket('#15803d', WHITE), fan()] },
    { name: 'Piccolo', parts: [turban(), cape(WHITE)], body: '#16a34a' },
    { name: 'Tsunade', parts: [jumpsuit('#9ca3af'), part({ 8: 'gg........gg', 9: 'gg........gg', 10: '..gg....gg..', 11: '..gg....gg..' }, { g: '#16a34a' }), hair('twintails', '#fde047'), foreheadMark('#7c3aed')] },
    { name: 'Holo', parts: [hair('long', '#b45309'), part({ 2: '..c......c..', 3: '..cw....wc..' }, { c: '#b45309', w: '#fef3c7' }), part({ 5: '.g..........', 6: 'rr..........', 7: 'rr..........' }, { g: '#16a34a', r: '#dc2626' })] },
    { name: 'Rei Ayanami', parts: [jumpsuit('#f8fafc'), part({ 9: '..k......k..', 10: '..o......o..' }, { k: '#111111', o: '#f97316' }), hair('bob', '#93c5fd'), clips(WHITE)] },
    { name: 'Profesor Oak', parts: [jumpsuit('#b91c1c'), labcoat(), hair('slick', '#9ca3af')] },
  ] },
  { id: 'WRI', name: 'Writer', color: '#e11d48', characters: [
    { name: 'Violet', parts: [jumpsuit('#1e3a8a'), part({ 8: '...ww..ww...' }, { w: WHITE }), brooch('#16a34a'), hair('braid', '#fde68a'), topBow('#2563eb')] },
    { name: 'Jiraiya', parts: [hair('longSpiky', WHITE), band(PLATE), underEyes(RED)] },
    { name: 'Misa', parts: [hair('twintails', '#fde047'), necklace(SILVER), jumpsuit('#111111')] },
    { name: 'Nobita', parts: [hair('messy', BLACK), glasses(), jumpsuit('#facc15'), part({ 11: '..bbbbbbbb..' }, { b: '#2563eb' })] },
    { name: 'Rukia', parts: [robe(BLACK), part({ 8: '...w....w...' }, { w: WHITE }), hair('bob', BLACK), part({ 6: '.....h......' }, { h: BLACK }), katana('#f1f5f9', WHITE)] },
    { name: 'Toge', parts: [jumpsuit('#1e293b'), hair('fluffy', '#e5e7eb'), highCollar('#1e293b')] },
    { name: 'Sailor Moon', parts: [hair('odango', '#fde047'), tiara(), sailor('#1d4ed8')] },
    { name: 'Sakura', parts: [hair('bob', '#f9a8d4'), headband(RED)] },
    { name: 'Uraraka', parts: [hair('bob', '#7c4a1e'), blush(), arms('#f9a8d4')] },
    { name: 'Asuka', parts: [hair('long', '#ea580c'), clips(RED), jumpsuit(RED)] },
  ] },
  { id: 'DES', name: 'Designer', color: '#ec4899', characters: [
    { name: 'Nami', parts: [hair('long', '#fb923c'), staff('#38bdf8')] },
    { name: 'Mitsuri', parts: [hair('twintails', '#f472b6', '#86efac'), part({ 8: 'h..........h', 9: 'h..........h' }, { h: '#86efac' }), haori(WHITE, '#f9a8d4')] },
    { name: 'Zero Two', parts: [hair('long', '#f472b6'), horns(RED), jumpsuit(RED)] },
    { name: 'Sailor Venus', parts: [hair('long', '#fde047'), bow(RED), sailor('#f97316', '#2563eb')] },
    { name: 'Rem', parts: [jumpsuit('#1f2937'), apron(), hair('bob', '#60a5fa'), part({ 4: '..wkwkwkwk..', 5: '........wpw.' }, { w: WHITE, k: BLACK, p: '#f9a8d4' })] },
    { name: 'Ram', parts: [hair('bob', '#f9a8d4'), maidBand(), apron()] },
    { name: 'Hisoka', parts: [hair('slick', '#dc2626'), starTear()] },
    { name: 'Yor', parts: [hair('long', BLACK), roses(), jumpsuit('#111111')] },
    { name: 'Tengen', parts: [hair('slick', WHITE), gems(), underEyes('#be123c')] },
    { name: 'Asuna', parts: [jumpsuit('#f8fafc'), part({ 8: 'rr........rr', 9: '....rrrr....' }, { r: '#dc2626' }), hair('long', '#ea7a2b'), katana('#e5e7eb', GOLD)] },
  ] },
  { id: 'REL', name: 'Release', color: '#1f9d6a', characters: [
    { name: 'Ace', parts: [hair('messy', BLACK), cowboy('#f97316', RED), part({ 8: '...r.rr.r...' }, { r: RED })] },
    { name: 'Ash', parts: [vest('#2563eb'), hair('messy', BLACK), cap(WHITE, RED, '#16a34a'), part({ 5: 'kk..........', 6: 'yy..........', 7: 'yr..........' }, { k: BLACK, y: '#facc15', r: '#ef4444' })] },
    { name: 'Kiki', parts: [jumpsuit('#1e1b4b'), hair('bob', BLACK), bow(RED), broom()] },
    { name: 'Eva-01', parts: [part({ 1: '.....g......', 2: '.....p......', 3: '....pp......', 4: '...pppp.....' }, { g: '#84cc16', p: '#6d28d9' }), part({ 8: 'gg........gg', 10: '..gg....gg..' }, { g: '#84cc16' })], body: '#6d28d9' },
    { name: 'Bakugo', parts: [jumpsuit('#111111'), part({ 8: '..o......o..', 9: '...o....o...', 10: '....o..o....' }, { o: '#f97316' }), arms('#6b7280'), hair('bigSpiky', '#fde68a'), part({ 7: '..k.kkkk.k..' }, { k: '#111111' })] },
    { name: 'Deku', parts: [hair('curly', '#15803d'), freckles(), jumpsuit('#14532d'), legs(RED)] },
    { name: 'Asta', parts: [cape(BLACK), hair('spikyUp', '#d4d4d8'), part({ 4: '..kkkkkkkk..', 5: '..kkkkkkkk..' }, { k: BLACK }), bigBlade()] },
    { name: 'Astro Boy', parts: [hair('hornHair', BLACK), legs(RED)] },
    { name: 'Kirito', parts: [jumpsuit('#111827'), part({ 10: '..g......g..', 11: '..g......g..' }, { g: '#4b5563' }), hair('bob', BLACK), part({ 5: '.k........t.', 6: '.k........t.', 7: '.k........t.' }, { k: '#111111', t: '#0d9488' })] },
    { name: 'Gundam', parts: [part({ 3: '..y......y..', 4: '...y....y...', 5: '....yrry....' }, { y: '#facc15', r: '#ef4444' }), part({ 8: '..bbbbbbbb..', 9: '..bybbbbyb..', 11: '....rrrr....' }, { b: '#1d4ed8', y: '#facc15', r: '#ef4444' })], body: '#f1f5f9', eyes: '#16a34a' },
  ] },
  { id: 'IDX', name: 'Indexer', color: '#c4572b', characters: [
    { name: 'Brock', parts: [hair('spiky', '#5b3a1e'), part({ 7: '..kk....kk..' }, { k: '#111111' }), vest('#15803d')] },
    { name: 'Guts', parts: [jumpsuit('#374151'), hair('spiky', BLACK), part({ 0: '..........gg', 1: '..........gg', 2: '..........gg', 3: '..........gg', 4: '..........gg', 5: '..........gg', 6: '..........gg', 7: '...........k' }, { g: '#9ca3af', k: '#111111' })] },
    { name: 'Hamtaro', parts: [part({ 4: '..oo....oo..', 5: '..op....po..' }, { o: '#f97316', p: '#f9a8d4' }), belly(WHITE, { 8: '...cccccc...', 9: '...cccccc...', 10: '....cccc....' }), part({ 8: '.....pp.....' }, { p: '#f9a8d4' })] },
    { name: 'Bulbasaur', parts: [part({ 1: '.....gg.....', 2: '....gGgg....', 3: '...gggGgg...', 4: '..gggggggg..', 5: '...gGggGg...' }, { g: '#16a34a', G: '#15803d' }), part({ 9: '...d....d...', 10: '.....d......' }, { d: '#0f766e' })], body: '#5eead4' },
    { name: 'Power', parts: [jumpsuit('#f1f5f9'), tie(BLACK), hair('long', '#fde68a'), horns('#dc2626')] },
    { name: 'Buggy', parts: [hair('long', '#38bdf8'), captain('#1f2937'), redNose()] },
    { name: 'Law', parts: [part({ 8: 'yyyyyyyyyyyy', 9: 'yykkyyyykkyy', 10: '..yyyyyyyy..', 11: '..kkkkkkkk..' }, { y: '#facc15', k: '#111111' }), part({ 2: '...wwwwww...', 3: '..wwkwwwkw..', 4: '..wwwwkwww..', 5: '..kkkkkkkk..', 6: '..k......k..', 7: '..k......k..' }, { w: '#f8fafc', k: '#78350f' }), goatee(BLACK), katana('#111111', '#facc15')] },
    { name: 'Saber', parts: [jumpsuit('#1d4ed8'), part({ 8: 'ss.ssssss.ss', 9: '...ssssss...' }, { s: '#cbd5e1' }), hair('bun', '#fde047'), part({ 2: '....bbbb....' }, { b: '#1d4ed8' }), katana('#e5e7eb', '#facc15')] },
    { name: 'Calcifer', parts: [part({ 1: '....y..y....', 2: '...y.yy.y...', 3: '..yo.yy.oy..', 4: '..oooyyooo..', 5: '..rooooorr..' }, { y: '#fde047', o: '#fb923c', r: '#ef4444' })], body: '#fb923c' },
    { name: 'Snorlax', parts: [part({ 5: '..t......t..' }, { t: '#0f766e' }), belly('#fef3c7', { 8: '...cccccc...', 9: '..cccccccc..', 10: '..cccccccc..', 11: '...cccccc...' })], body: '#0f766e' },
  ] },
  { id: 'PRO', name: 'Processor', color: '#fb923c', characters: [
    { name: 'Sanji', parts: [suit(BLACK, '#93c5fd'), tie(BLACK), hair('coverRight', '#fde047'), part({ 6: '...kk.......' }, { k: '#111111' }), cigar()] },
    { name: 'Soma', parts: [jumpsuit(WHITE), part({ 9: '....k..k....', 10: '....k..k....' }, { k: '#111111' }), hair('spiky', '#b91c1c'), band(WHITE)] },
    { name: 'Majin Buu', parts: [antenna('#f472b6'), cape('#6d28d9'), belt(BLACK, GOLD)], body: '#f9a8d4' },
    { name: 'Nezuko', parts: [hair('long', BLACK, '#f97316'), part({ 2: '.........pp.', 3: '.........pp.' }, { p: '#f472b6' }), part({ 8: '..BbbbbbB...' }, { B: '#3f6212', b: '#84cc16' })] },
    { name: 'Zenitsu', parts: [hair('messy', '#facc15', '#f97316'), haori('#fde047', '#f59e0b')] },
    { name: 'Genos', parts: [hair('messy', '#fde047'), arms('#374151')], eyes: '#facc15' },
    { name: 'Freezer', parts: [domeCap('#7c3aed')], body: '#f8fafc', eyes: '#dc2626' },
    { name: 'Ditto', parts: [part({ 9: '....kkkk....' }, { k: '#4c1d95' })], body: '#c4b5fd' },
    { name: 'Charizard', parts: [part({ 4: 't..o....o..t', 5: 'tt.o....o.tt', 6: 'tt........tt', 7: '.t........t.' }, { t: '#0e7490', o: '#ea580c' }), belly('#fde68a'), flameTail()] },
    { name: 'Trunks', parts: [part({ 8: 'bbkkkkkkkkbb', 9: 'bbkkkkkkkkbb', 10: '..kkkkkkkk..', 11: '..kkkkkkkk..' }, { b: '#2563eb', k: '#1f2937' }), hair('bob', '#c4b5fd'), part({ 3: '..........k.', 4: '..........k.', 5: '.........kk.' }, { k: '#78350f' })] },
  ] },
  { id: 'EXP', name: 'Explorer', color: '#0ea5e9', characters: [
    { name: 'Gon', parts: [hair('spikyUp', BLACK, '#14532d'), jumpsuit('#15803d'), fishingRod()] },
    { name: 'Naruto', parts: [hair('naruto', '#fbbf24'), headband(), part({ 8: '..k......k..' }, { k: '#7c2d12' })] },
    { name: 'Goku niño', parts: [hair('spiky', BLACK), belt('#2563eb', '#2563eb'), staff(RED)] },
    { name: 'Charmander', parts: [belly('#fde68a'), flameTail()] },
    { name: 'Pikachu', parts: [longEars(), part({ 8: '..r......r..' }, { r: '#ef4444' })], body: '#facc15' },
    { name: 'Eevee', parts: [part({ 1: '..b......b..', 2: '..bb....bb..', 3: '..bb....bb..', 4: '...b....b...', 5: '...bb..bb...' }, { b: '#b45309' }), part({ 8: '..cccccccc..', 9: '...cccccc...', 10: '..........bb', 11: '..........cc' }, { c: '#fef3c7', b: '#b45309' })], body: '#b45309' },
    { name: 'Tanjiro', parts: [haori('#15803d', '#111111'), hair('messy', '#7f1d1d'), part({ 6: '.w.x......w.', 7: '.r........r.' }, { w: WHITE, r: RED, x: '#7f1d1d' })] },
    { name: 'Jiji', parts: [pointyEars('#111111')], body: '#111111', eyes: '#f8fafc' },
    { name: 'Chihiro', parts: [hair('pony', '#5b3a1e'), part({ 6: '..........pp' }, { p: '#a855f7' }), jumpsuit('#fbcfe8')] },
    { name: 'Jigglypuff', parts: [part({ 4: '..p..pp..p..', 5: '..pp.p..pp..' }, { p: '#f472b6' })], body: '#f9a8d4', eyes: '#1d4ed8' },
  ] },
  { id: 'BUI', name: 'Builder', color: '#f5b800', characters: [
    { name: 'Franky', parts: [vest('#dc2626'), part({ 9: 'b.y......y.b' }, { b: '#2563eb', y: '#facc15' }), hair('pompadour', '#38bdf8'), part({ 5: '..kkk..kkk..' }, { k: '#111111' })] },
    { name: 'All Might', parts: [part({ 0: '..y......y..', 1: '..yy....yy..', 2: '...yy..yy...', 3: '..yyyyyyyy..', 4: '..yyyyyyyy..', 5: '..yy.yy.yy..' }, { y: '#facc15' }), part({ 6: '..bbb..bbb..' }, { b: '#1e3a8a' }), part({ 8: '...wwwwww...' }, { w: WHITE })] },
    { name: 'Saitama', parts: [part({ 6: '...w........' }, { w: WHITE }), arms(RED), belt(BLACK, BLACK), cape(WHITE, '#d1d5db')] },
    { name: 'Kamina', parts: [cape('#dc2626'), hair('bigSpiky', '#1e40af'), pointyShades('#f97316'), part({ 9: '...kk..kk...' }, { k: '#111111' })] },
    { name: 'Simon', parts: [hair('messy', NAVY), goggles('#374151', '#fde047'), drill()] },
    { name: 'Kaido', parts: [part({ 4: '..kkkkkkkk..', 5: '.kkkkkkkkkk.', 6: '.k........k.', 7: '.k........k.', 8: '.k........k.' }, { k: BLACK }), bigHorns(WHITE), mustache(BLACK), part({ 2: '..........gg', 3: '..........gg', 4: '..........gg', 5: '...........s', 6: '...........s', 7: '...........s' }, { g: '#6b7280', s: '#92400e' })] },
    { name: 'Mazinger Z', parts: [part({ 4: '...k....k...', 5: '..kkkkkkkk..' }, { k: '#111111' }), part({ 8: '..rr....rr..', 9: '...rr..rr...' }, { r: '#dc2626' })], body: '#475569', eyes: '#facc15' },
    { name: 'Goku SSJ', parts: [hair('bigSpiky', '#facc15'), belt('#1d4ed8', '#1d4ed8'), part({ 9: 'bb........bb' }, { b: '#1d4ed8' })] },
    { name: 'Pochita', parts: [part({ 1: '.....gg.....', 2: '.....gg.....', 3: '....gkkg....', 4: '....gggg....', 5: '..d.gggg.d..', 6: '..d......d..' }, { g: '#d1d5db', k: '#6b7280', d: '#c2410c' }), part({ 10: '..........kk', 11: '...........y' }, { k: '#111111', y: '#facc15' })] },
    { name: 'Winry', parts: [hair('pony', '#fde68a'), bandana('#1f2937'), wrench()] },
  ] },
  { id: 'SPE', name: 'Specialist', color: '#a855f7', characters: [
    { name: 'Megumin', parts: [jumpsuit('#b91c1c'), cape(BLACK), hair('bob', '#5b3a1e'), witch(BLACK, '#f97316'), part({ 6: '..kkkkkkkk..', 7: '.......kk...' }, { k: '#111111' }), part({ 1: '..........rr', 2: '..........rr', 3: '...........s', 4: '...........s', 5: '...........s', 6: '...........s', 7: '...........s' }, { r: '#dc2626', s: '#78350f' })] },
    { name: 'Sukuna', parts: [robe(WHITE), hair('spiky', '#fda4af'), underEyes(BLACK), part({ 6: '..k......k..' }, { k: BLACK })] },
    { name: 'Madara', parts: [shoulderArmor('#b91c1c', '#7f1d1d'), hair('longSpiky', BLACK), part({ 2: '.........www', 3: '.........wrw', 4: '.........www', 5: '..........k.', 6: '..........k.' }, { w: WHITE, r: '#dc2626', k: '#78350f' })] },
    { name: 'Obito', parts: [cloak('#111827'), hair('spiky', BLACK), part({ 6: '..ookkkkoo..', 7: '..okoooo.o..', 8: '..ookkkkoo..' }, { o: '#f97316', k: '#7c2d12' })] },
    { name: 'Pain', parts: [cloak('#111827'), hair('spiky', '#ea580c'), part({ 7: '.g........g.', 8: '.....gg.....' }, { g: '#9ca3af' })] },
    { name: 'Rimuru', parts: [], body: '#7dd3fc' },
    { name: 'Aqua', parts: [hair('long', '#38bdf8'), part({ 3: '....bbbb....' }, { b: '#1d4ed8' }), staff('#38bdf8')] },
    { name: 'Itadori', parts: [jumpsuit('#111827'), part({ 8: '..rrrrrrrr..' }, { r: '#b91c1c' }), part({ 3: '...pppppp...', 4: '..pppppppp..', 5: '..kppppppk..', 6: '..k......k..' }, { p: '#fda4af', k: '#1f2937' })] },
    { name: 'Mewtwo', parts: [part({ 4: '..p......pp.', 5: '..pp....p...', 6: '..........p.' }, { p: '#c084fc' }), belly('#c084fc', { 10: '...cccccc...', 11: '...cccccc...' }), part({ 11: '..........pp', 12: '...........p', 13: '..........pp' }, { p: '#c084fc' })], body: '#e9d5ff' },
    { name: 'Sakura Card Captor', parts: [jumpsuit('#f9a8d4'), hair('short', '#a16207'), part({ 5: '.p........p.' }, { p: '#f472b6' }), part({ 2: '..........y.', 3: '.........yyy', 4: '..........y.', 5: '..........p.', 6: '..........p.', 7: '..........p.' }, { y: '#facc15', p: '#f472b6' })] },
  ] },
]

// Busy-state animations. A part with `anim` is drawn in its own group with that SMIL markup;
// `fxOnly` parts (sparks, flames, bubbles) exist only while the agent works.
// Negative begins start each loop mid-cycle, so staggered effects need no hidden first frame.
const loop = (dur, begin = 0) => `dur="${dur}s" begin="${-begin}s" repeatCount="indefinite"`
const A = {
  swing: (px, py, deg = 30, dur = 0.6) => `<animateTransform attributeName="transform" type="rotate" values="0 ${px} ${py};${-deg} ${px} ${py};0 ${px} ${py}" ${loop(dur)}/>`,
  shake: (d = 0.4, dur = 0.15) => `<animateTransform attributeName="transform" type="translate" values="0 0;${d} 0;${-d} 0;0 0" ${loop(dur)}/>`,
  hover: (dy = -1, dur = 1.2) => `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${dy};0 0" ${loop(dur)}/>`,
  slide: (dx, dy, dur = 0.5, begin = 0) => `<animateTransform attributeName="transform" type="translate" values="0 0;${dx} ${dy};0 0" ${loop(dur, begin)}/>`,
  flicker: (dur = 0.4, begin = 0) => `<animate attributeName="opacity" values="1;0.15;1" ${loop(dur, begin)}/>`,
  blink: (dur = 0.8, begin = 0) => `<animate attributeName="opacity" values="0;1;0" ${loop(dur, begin)}/>`,
  rise: (dx, dy, dur = 1.2, begin = 0) =>
    `<animateTransform attributeName="transform" type="translate" values="0 0;${dx} ${dy}" ${loop(dur, begin)}/>` +
    `<animate attributeName="opacity" values="0;1;1;0" ${loop(dur, begin)}/>`,
}

const fx = (rows, colors, ...effects) => ({ ...part(rows, colors), anim: effects.join(''), fxOnly: true })
// Wide particles at the right edge are pulled back inside the 12-column grid.
const row = (x, c, w = 1) => '.'.repeat(Math.min(x, 12 - w)) + 'c'.repeat(w) + '.'.repeat(12 - Math.min(x, 12 - w) - w)
// Single pixels (or short dashes) drifting by (dx, dy), evenly staggered.
const particles = (c, points, dx, dy, dur = 1.2, w = 1) =>
  points.map(([x, y], i) => fx({ [y]: row(x, 'c', w) }, { c }, A.rise(dx, dy, dur, (i * dur) / points.length)))
const aura = (c, dur = 0.3) => [
  fx({ 5: '..c......c..', 7: 'c..........c', 10: '.c........c.' }, { c }, A.blink(dur)),
  fx({ 6: '.c........c.', 9: 'c..........c', 11: '.c........c.' }, { c }, A.blink(dur, dur / 2)),
]
const lightningHand = (c = '#60a5fa') => [
  fx({ 7: '..........c.', 8: '.........c.c', 9: '..........c.', 10: '.........c.c' }, { c }, A.flicker(0.15)),
  fx({ 7: '.........w.w', 9: '.........w.w' }, { w: '#ffffff' }, A.blink(0.3)),
]
const handOrb = (c, dur = 0.6) => fx({ 6: '..........cc', 7: '..........cc' }, { c }, A.blink(dur))
const handFlames = () => [...particles('#f97316', [[0, 7], [11, 7], [1, 6], [10, 6]], 0, -3, 0.8), ...particles('#facc15', [[0, 6], [11, 6]], 0, -2, 0.8)]
const glint = (x, y) => fx({ [y]: row(x, 'c') }, { c: '#ffffff' }, A.blink(1.2))
const notes = c => particles(c, [[11, 6], [10, 4], [0, 5]], 0, -3, 1.4)
const petals = c => particles(c, [[11, 1], [9, 0], [0, 2], [2, 0]], -1, 5, 1.8)
const bubbles = c => particles(c, [[11, 5], [10, 3], [11, 1]], 0, -3, 1.2)
const sideSwing = (px, py, deg = 25, dur = 0.5) => A.swing(px, py, deg, dur)
const STAFF_PIVOT = [11.5, 8]

// Keyed by character name: animate maps a part index to its effect; fx adds busy-only parts;
// motion replaces the default bob (float, shake, fade, jiggle).
const ANIMATIONS = {
  // Orchestrator
  'Luffy': { fx: [fx({ 8: '..........cc', 9: '..........cc' }, { c: '#f2604a' }, A.slide(4, 0, 0.5))] },
  'Gojo': { fx: [fx({ 6: 'b...........' }, { b: '#3b82f6' }, A.blink(1)), fx({ 6: '...........r' }, { r: '#ef4444' }, A.blink(1, 0.5)), fx({ 4: '.....pp.....' }, { p: '#a855f7' }, A.blink(2, 1))] },
  'Barbablanca': { motion: 'shake', fx: [fx({ 3: 'c..........c', 4: '.c........c.', 5: 'c..........c' }, { c: '#e5e7eb' }, A.blink(0.5))] },
  'Shanks': { fx: [fx({ 5: '.r........r.', 6: 'k..........k', 7: '.r........r.' }, { r: '#dc2626', k: '#111111' }, A.flicker(0.3))] },
  'Alucard': { fx: particles('#111111', [[10, 6], [0, 7], [11, 4], [1, 5]], 1, -5, 1.6, 2) },
  'Dio': { fx: particles('#7c3aed', [[0, 5], [10, 4], [1, 2]], 0, -3, 1.4, 2) },
  'Lelouch': { fx: [fx({ 6: '..rrr.......', 7: '..r.r.......', 8: '..rrr.......' }, { r: '#f87171' }, A.blink(1.2))] },
  'Minato': { fx: [fx({ 3: 'k...........', 4: 'k...........' }, { k: '#4b5563' }, A.blink(0.8)), fx({ 3: '...........k', 4: '...........k' }, { k: '#4b5563' }, A.blink(0.8, 0.4)), fx({ 2: 'y..........y' }, { y: '#fde047' }, A.blink(0.4))] },
  'Vegeta': { fx: aura('#facc15') },
  'Byakuya': { fx: petals('#f9a8d4') },
  // Architect
  'Hatsune Miku': { animate: { 3: A.shake(0.5, 0.4) }, fx: notes('#2dd4bf') },
  'L': { fx: [fx({ 7: '..........ww' }, { w: '#f8fafc' }, A.hover(-2, 1))] },
  'Jotaro': { fx: [fx({ 7: '..........pp', 8: '..........pp' }, { p: '#7c3aed' }, A.slide(2, -1, 0.25)), fx({ 9: '..........pp', 10: '..........pp' }, { p: '#a78bfa' }, A.slide(2, 1, 0.25, 0.12))] },
  'Ainz': { fx: particles('#a855f7', [[1, 10], [10, 9], [0, 7], [11, 6]], 0, -4, 1.5) },
  'Doraemon': { motion: 'float', fx: [fx({ 4: '...yyyyyy...', 5: '.....kk.....' }, { y: '#facc15', k: '#92400e' }, A.blink(0.2)), fx({ 4: '.....yy.....', 5: '.....kk.....' }, { y: '#facc15', k: '#92400e' }, A.blink(0.2, 0.1))] },
  'Kakashi': { fx: lightningHand() },
  'Yugi': { animate: { 2: A.flicker(0.6) }, fx: [glint(5, 9)] },
  'Shin-chan': { motion: 'shake' },
  'Meowth': { animate: { 2: A.swing(10, 10, 25, 0.6) }, fx: [glint(6, 5)] },
  // Inspector
  'Conan': { fx: [fx({ 6: '....w....w..' }, { w: '#ffffff' }, A.blink(1))] },
  'Levi': { fx: [fx({ 5: '...........g', 6: '...........g', 7: '...........g' }, { g: '#cbd5e1' }, A.swing(11.5, 8, 40, 0.4)), fx({ 5: 'g...........', 6: 'g...........', 7: 'g...........' }, { g: '#cbd5e1' }, A.swing(0.5, 8, -40, 0.4))] },
  'Vash': { fx: [fx({ 7: '..........gg' }, { g: '#d1d5db' }, A.slide(-0.5, 0, 0.4)), fx({ 6: '...........y' }, { y: '#fde047' }, A.blink(0.4))] },
  'Hinata Hyuga': { fx: [fx({ 6: '..v.v..v.v..' }, { v: '#a78bfa' }, A.flicker(0.8))] },
  'Sasuke': { fx: lightningHand('#93c5fd') },
  'Inuyasha': { animate: { 2: A.shake(0.3, 0.3) } },
  'Totoro': { fx: [fx({ 1: '...gggggg...', 2: '..g..k...g..' }, { g: '#16a34a', k: '#14532d' }, A.hover(-1, 1.2))] },
  'Sesshomaru': { fx: [fx({ 8: '.g..........', 9: 'g.g.........', 10: '.g..........' }, { g: '#4ade80' }, A.flicker(0.3))] },
  'Aizawa': { animate: { 0: A.hover(-1, 0.6), 2: A.shake(0.4, 0.4) } },
  'Saiki': { fx: [fx({ 4: '.p........p.', 5: 'p..........p' }, { p: '#f472b6' }, A.blink(0.8))] },
  // Guardian
  'Zoro': { animate: { 3: A.swing(10.5, 10, 20, 0.5) } },
  'Itachi': { fx: particles('#111111', [[10, 5], [0, 6], [11, 3]], 1, -4, 1.4, 2) },
  'Gaara': { fx: particles('#c2a26b', [[0, 11], [11, 11], [1, 8], [10, 8]], 0, -3, 1.2) },
  'Alphonse': { fx: [fx({ 7: '...y....y...' }, { y: '#fde047' }, A.flicker(0.6))] },
  'Mikasa': { animate: { 1: A.shake(0.4, 0.4) } },
  'Kenpachi': { animate: { 1: A.shake(0.3, 0.2) }, fx: aura('#facc15', 0.4) },
  'Rengoku': { animate: { 2: A.flicker(0.3) }, fx: particles('#f97316', [[1, 3], [10, 2], [0, 5], [11, 4]], 0, -3, 0.9) },
  'Giyu': { fx: particles('#38bdf8', [[0, 10], [11, 9], [1, 7], [10, 6]], 0, -3, 1) },
  'Ichigo': { animate: { 2: A.swing(11, 7, 35, 0.6) } },
  'Kirishima': { fx: [fx({ 8: 'kk........kk', 9: 'kk........kk' }, { k: '#374151' }, A.blink(0.6))] },
  // Tester
  'Senku': { fx: bubbles('#86efac') },
  'Hange': { fx: bubbles('#c084fc') },
  'Bulma': { animate: { 2: A.swing(11, 7, 30, 0.5) } },
  'Orochimaru': { fx: [fx({ 8: '..........kp', 9: '.........pp.' }, { p: '#7c3aed', k: '#111111' }, A.slide(1, -1, 0.6))] },
  'Chopper': { animate: { 0: A.hover(-1, 0.5) } },
  'Edward Elric': { fx: [fx({ 8: 'b..........b', 10: '.b........b.' }, { b: '#60a5fa' }, A.blink(0.5))] },
  'Shinobu': { fx: [fx({ 4: '.........p.p', 5: '..........p.' }, { p: '#c084fc' }, A.hover(-2, 0.8))] },
  // Debugger
  'Gintoki': { animate: { 3: A.swing(...STAFF_PIVOT, 35, 0.5) } },
  'Ranma': { fx: [fx(HAIR.braid, { H: '#dc2626' }, A.blink(2.4))] },
  'Bocchi': { motion: 'shake' },
  'Usopp': { fx: particles('#111111', [[11, 6]], 2, -4, 0.6) },
  'Kaneki': { fx: [fx({ 4: 'r..........r', 5: 'r..........r', 6: '.r........r.', 7: '.r........r.' }, { r: '#dc2626' }, A.shake(0.5, 0.5))] },
  'Detective Pikachu': { animate: { 0: A.shake(0.3, 0.3) }, fx: [fx({ 7: 'y..........y', 9: 'y..........y' }, { y: '#facc15' }, A.blink(0.4))] },
  'Sin Cara': { motion: 'fade' },
  'Gengar': { motion: 'float', animate: { 1: A.flicker(0.8) } },
  'Psyduck': { motion: 'shake', fx: [fx({ 2: '..b......b..', 3: '.b........b.' }, { b: '#60a5fa' }, A.blink(0.6))] },
  'Squirtle': { fx: bubbles('#7dd3fc') },
  // Researcher
  'Robin': { fx: [fx({ 6: 'c..........c', 7: 'c..........c' }, { c: '#f2604a' }, A.blink(0.8)), ...petals('#f9a8d4')] },
  'Frieren': { fx: particles('#fde68a', [[0, 6], [11, 4], [1, 2], [10, 1]], 0, -2, 1.6) },
  'Sailor Mercury': { fx: bubbles('#bae6fd') },
  'Maestro Roshi': { fx: [handOrb('#60a5fa')] },
  'Urahara': { animate: { 2: A.shake(0.4, 0.25) } },
  'Piccolo': { fx: [fx({ 3: '..........p.', 4: '..........y.', 5: '..........p.', 6: '..........y.' }, { y: '#fde047', p: '#a855f7' }, A.flicker(0.2))] },
  'Holo': { animate: { 2: A.hover(-1, 0.8) }, fx: [fx({ 10: '..........cc', 11: '...........w' }, { c: '#b45309', w: '#fef3c7' }, A.swing(10, 10, 25, 0.6))] },
  'Profesor Oak': { fx: [fx({ 6: '..........rr', 7: '..........ww' }, { r: '#ef4444', w: '#f8fafc' }, A.hover(-1, 0.8))] },
  // Writer
  'Violet': { fx: [fx({ 6: '..........ww', 7: '..........ww' }, { w: '#f8fafc' }, A.hover(-1, 1))] },
  'Jiraiya': { fx: [handOrb('#60a5fa', 0.3)] },
  'Misa': { fx: particles('#f472b6', [[11, 5], [0, 4], [10, 2]], 0, -3, 1.4) },
  'Nobita': { fx: [glint(4, 7)] },
  'Rukia': { animate: { 4: A.swing(11, 7, 30, 0.6) }, fx: particles('#e0f2fe', [[0, 6], [1, 3], [11, 2]], 0, -3, 1.4) },
  'Sailor Moon': { fx: [fx({ 5: '.....ww.....' }, { w: '#ffffff' }, A.blink(0.8))] },
  'Sakura': { fx: petals('#f9a8d4') },
  'Uraraka': { motion: 'float' },
  // Designer
  'Nami': { fx: [fx({ 0: '.........ggg', 1: '..........y.', 2: '...........y' }, { g: '#9ca3af', y: '#facc15' }, A.blink(0.6))] },
  'Mitsuri': { fx: [fx({ 4: '.........pp.', 5: '..........p.', 6: '...........p', 7: '...........p' }, { p: '#f472b6' }, A.swing(11.5, 8, 50, 0.5))] },
  'Zero Two': { fx: [fx({ 4: '..r......r..' }, { r: '#fca5a5' }, A.blink(1))] },
  'Sailor Venus': { fx: particles('#fb923c', [[11, 5], [0, 4], [10, 2]], 0, -3, 1.4) },
  'Rem': { fx: [fx({ 3: '.........ggg', 4: '.........ggg', 5: '..........k.', 6: '...........k', 7: '...........k' }, { g: '#6b7280', k: '#374151' }, A.swing(11.5, 8, 45, 0.5))] },
  'Hisoka': { fx: particles('#f8fafc', [[11, 6], [0, 5], [10, 3]], 1, -3, 1.2) },
  'Yor': { fx: petals('#e11d48') },
  'Tengen': { animate: { 1: A.flicker(0.3) } },
  'Asuna': { animate: { 3: A.slide(0, -2, 0.3) } },
  // Release
  'Ace': { fx: handFlames() },
  'Ash': { fx: [fx({ 4: '..y.........', 6: '..y.........' }, { y: '#facc15' }, A.blink(0.3))] },
  'Kiki': { motion: 'float' },
  'Eva-01': { motion: 'shake', fx: [fx({ 7: '...g....g...' }, { g: '#a3e635' }, A.blink(0.5))] },
  'Bakugo': { fx: [fx({ 6: 'o..........o', 7: 'yo........oy' }, { o: '#f97316', y: '#fde047' }, A.blink(0.4))] },
  'Deku': { fx: aura('#4ade80', 0.2) },
  'Asta': { fx: particles('#111111', [[0, 8], [11, 7], [1, 4], [10, 3]], 0, -3, 1) },
  'Astro Boy': { motion: 'float', fx: [fx({ 13: '..o.o..o.o..' }, { o: '#f97316' }, A.flicker(0.2))] },
  'Kirito': { animate: { 3: A.shake(0.3, 0.3) } },
  'Gundam': { fx: [fx({ 2: '...........p', 3: '...........p', 4: '...........p', 5: '...........p', 6: '...........w', 7: '...........w' }, { p: '#f472b6', w: '#e5e7eb' }, A.swing(11.5, 8, 30, 0.6))] },
  // Indexer
  'Guts': { animate: { 2: A.swing(11, 7, 30, 0.7) } },
  'Hamtaro': { animate: { 0: A.shake(0.3, 0.4) } },
  'Bulbasaur': { fx: [fx({ 6: '...........g', 7: '...........g', 8: '..........gg' }, { g: '#16a34a' }, A.swing(10, 8, 40, 0.5))] },
  'Power': { fx: particles('#dc2626', [[0, 7], [11, 6], [1, 4]], 0, -3, 1.2) },
  'Buggy': { animate: { 0: A.hover(-2, 1), 1: A.hover(-2, 1) } },
  'Law': { fx: [fx({ 3: '.b........b.', 4: 'b..........b', 10: 'b..........b', 11: '.b........b.' }, { b: '#60a5fa' }, A.blink(1.2))] },
  'Saber': { fx: [fx({ 2: '...........y', 3: '...........y', 4: '...........y', 5: '...........y' }, { y: '#fde047' }, A.blink(0.6))] },
  'Calcifer': { animate: { 0: A.flicker(0.3) } },
  'Snorlax': { motion: 'jiggle' },
  // Processor
  'Sanji': { fx: [fx({ 12: '..r.r..r.r..', 13: '..y.y..y.y..' }, { r: '#ef4444', y: '#facc15' }, A.flicker(0.25)), ...particles('#9ca3af', [[11, 6]], 0, -4, 1.4)] },
  'Soma': { fx: particles('#f8fafc', [[10, 6], [11, 5]], 0, -3, 1.2) },
  'Majin Buu': { fx: particles('#f8fafc', [[3, 4], [8, 4]], 0, -3, 1) },
  'Nezuko': { fx: particles('#f472b6', [[0, 9], [11, 8], [1, 6], [10, 5]], 0, -3, 1) },
  'Zenitsu': { fx: aura('#facc15', 0.15) },
  'Genos': { fx: [fx({ 8: 'oo........oo', 9: 'oo........oo' }, { o: '#f97316' }, A.blink(0.6))] },
  'Freezer': { fx: [fx({ 6: '...........p', 7: '..........p.' }, { p: '#c084fc' }, A.blink(0.4))] },
  'Ditto': { motion: 'jiggle', fx: [fx({ 4: '..y......y..', 5: '..y......y..' }, { y: '#facc15' }, A.blink(1.5))] },
  'Charizard': { animate: { 0: A.hover(-1, 0.4), 2: A.flicker(0.3) } },
  'Trunks': { animate: { 2: A.swing(10, 6, 30, 0.5) } },
  // Explorer
  'Gon': { animate: { 2: A.swing(11.5, 8, 15, 0.8) } },
  'Naruto': { fx: [handOrb('#60a5fa', 0.4), ...particles('#f8fafc', [[0, 9], [1, 5]], 0, -2, 1)] },
  'Goku niño': { animate: { 2: A.slide(0, -2, 0.6) } },
  'Charmander': { animate: { 1: A.flicker(0.3) } },
  'Pikachu': { animate: { 0: A.shake(0.2, 0.3) }, fx: [fx({ 7: 'y..........y', 9: 'y..........y' }, { y: '#facc15' }, A.blink(0.3))] },
  'Eevee': { animate: { 0: A.shake(0.3, 0.4) } },
  'Tanjiro': { fx: particles('#38bdf8', [[0, 10], [11, 9], [1, 7], [10, 6]], 0, -3, 1) },
  'Jiji': { fx: [fx({ 10: '..........kk', 11: '...........k', 12: '...........k' }, { k: '#111111' }, A.swing(10, 10, 25, 0.6))] },
  'Chihiro': { fx: [fx({ 13: 'k..........k' }, { k: '#111111' }, A.hover(-2, 0.4))] },
  'Jigglypuff': { fx: notes('#f472b6') },
  // Builder
  'Franky': { fx: [fx({ 2: '.y........y.', 3: 'y..........y' }, { y: '#facc15' }, A.blink(0.6))] },
  'All Might': { fx: [fx({ 7: 'w..........w', 8: '.w........w.', 9: 'w..........w' }, { w: '#ffffff' }, A.blink(0.4))] },
  'Saitama': { animate: { 3: A.shake(0.4, 0.4) } },
  'Kamina': { animate: { 0: A.shake(0.4, 0.4) }, fx: [glint(1, 6)] },
  'Simon': { animate: { 2: A.shake(0.3, 0.08) } },
  'Kaido': { animate: { 3: A.swing(11, 8, 30, 0.7) } },
  'Mazinger Z': { fx: [fx({ 8: '..........kk', 9: '..........kk' }, { k: '#475569' }, A.slide(4, 0, 0.8))] },
  'Goku SSJ': { fx: aura('#facc15', 0.2) },
  'Pochita': { animate: { 0: A.shake(0.3, 0.06) } },
  'Winry': { animate: { 2: A.swing(11, 7, 30, 0.5) } },
  // Specialist
  'Megumin': { fx: [fx({ 0: '.........ror', 1: '..........r.' }, { r: '#ef4444', o: '#f97316' }, A.blink(0.5))] },
  'Sukuna': { fx: [fx({ 8: '.r........r.', 9: 'r..........r' }, { r: '#dc2626' }, A.flicker(0.2))] },
  'Madara': { animate: { 2: A.swing(11, 6, 30, 0.6) } },
  'Obito': { motion: 'fade' },
  'Pain': { fx: [fx({ 4: 'p..........p', 7: 'p..........p', 11: 'p..........p' }, { p: '#a78bfa' }, A.blink(0.8))] },
  'Rimuru': { motion: 'jiggle' },
  'Aqua': { fx: particles('#38bdf8', [[11, 2], [10, 4]], 0, 4, 1) },
  'Itadori': { fx: [fx({ 8: 'bb........bb', 9: 'kk........kk' }, { b: '#3b82f6', k: '#111111' }, A.blink(0.5))] },
  'Mewtwo': { motion: 'float', fx: [handOrb('#7c3aed')] },
  'Sakura Card Captor': { animate: { 3: A.swing(11, 7, 20, 0.8) }, fx: particles('#f9a8d4', [[9, 2], [0, 4]], 0, -2, 1.4) },
}
