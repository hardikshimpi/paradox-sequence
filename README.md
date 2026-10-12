# Paradox Sequence

A browser time-loop puzzle game. Every room gives you a few seconds. When time runs out, the room resets, and the attempt you just made becomes a **ghost** that replays your exact inputs alongside you. You solve each room by working with your past selves: one holds a plate, another flips a switch, and you walk out.

The game has **75 levels across five worlds**. Each world has its own look, animated key art, ambient effects and music, and introduces a new mechanic. Difficulty never drops from one level to the next.

| World | Levels | Key art | New mechanic |
|---|---|---|---|
| Echo Labs | 1–15 | A pulsing grid with your echoes walking behind you | Plates, switches, doors, lifts, keys, lasers, order panels |
| Clockwork Foundry | 16–30 | Interlocking gears and rising embers | Conveyor belts and timed shutters |
| Drowned Observatory | 31–45 | Swaying light shafts, a sunken dome, bubbles | Bounce pads and portals |
| Neon Spire | 46–60 | A parallax skyline, blinking windows, rain | Echo screens: cyan stops ghosts, gold stops you |
| Event Horizon | 61–75 | A starfield bent around a spinning accretion disk | Crumbling floors — and everything at once |

The **World Map** shows all five worlds as round windows onto their live animated scenes, joined by a road that lights up as you progress, with a gold marker (and your ghost echoes) at the world you are in. Tap a world to open its levels; each world's level list has its own animated banner, and entering a new world plays a full-screen title card over its scene.

**Mobile:** Paradox Sequence is a landscape game. On a phone held sideways the HUD moves into the side gutters next to the touch pads, so the room uses the full screen height and no control ever covers it; menus and overlays switch to compact layouts for short screens. Held upright, the game pauses and asks you to rotate (you can choose to play in portrait anyway). On browsers that support it, *Play fullscreen* (main menu) and *Fullscreen* (pause menu) hide the browser UI and lock landscape; installed to the home screen, the game launches fullscreen in landscape.

Built with TypeScript, React, Vite and HTML Canvas. No game engine and no external assets: all graphics are procedural and all sound is synthesised.

## Quick start

Requires Node.js 18 or newer (developed on Node 20).

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build on http://localhost:4173 |
| `npm test` | Unit and level-solution tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright); builds and serves the app automatically |
| `npm run typecheck` | TypeScript only |

Before running the browser tests for the first time, install Chromium:

```bash
npx playwright install chromium
```

## How to play

| Action | Keyboard | Touch |
|---|---|---|
| Move | A / D or ← / → | ◀ ▶ pad |
| Jump | W / ↑ / Space | big ▲ button |
| Interact (switches) | E / S / ↓ | ✋ button |
| Loop Now: end the attempt and keep it as a ghost | T | Loop button |
| Restart Attempt: retry this loop, ghosts kept | R | ↻ in the HUD |
| Restart Level: clear every ghost | Shift + R | HUD (wide screens) or Pause menu |
| Hints | H | 💡 in the HUD |
| Pause | Esc / P | ❚❚ in the HUD |

**Rules**

- Each level has a fixed loop length. When the timer hits zero, the attempt is recorded as a ghost and the room resets. **Loop Now** does the same thing early.
- Ghosts replay your recorded inputs on the shared timeline from 0 s, under the same physics and interaction rules as you. When a ghost's recording ends, it stands still, which is how it holds a plate.
- **Restart Attempt** discards only the current attempt. **Restart Level** erases every ghost and resets the puzzle.
- **Dying** discards the attempt and restarts it, keeping your ghosts. Ghosts can die too, and a dead ghost is gone for the rest of that loop.
- Some levels limit how many ghosts you can keep. When the slots are full, further loops are not recorded.
- Only you (the gold, solid character) can use the exit. Ghosts are translucent and labelled G1, G2 and so on.
- You can steer in mid-air, so on a touch screen you can tap jump and then a direction; no simultaneous presses are needed.
- Switching tabs or minimising the window pauses the game, so the timer never runs in the background.

### Puzzle objects

Every signal source (plate, switch, sequence panel) has a **colour and a symbol**. Doors, bridges, lifts, lasers and the exit show the colour and symbol of whatever powers them; a slashed symbol means "active while that source is off". Links never rely on colour alone.

| Object | Behaviour |
|---|---|
| Pressure plate | Active while at least *n* characters (shown as dots) stand on it |
| Switch | Interact toggles it. Round **timed buttons** stay on for a few seconds, and pressing again re-arms them |
| Door | Solid unless its condition holds |
| Hard-light bridge | Solid only while its condition holds |
| Moving platform / lift | One-way platform. Travels while powered and returns when unpowered; unpowered ones shuttle back and forth. Carries riders |
| Key and lock | Whoever touches a key first carries it, ghosts included. A matching lock opens on touch and uses up the key. Keys reset every loop unless marked persistent |
| Laser | Deadly while active. Driven by a condition, a fixed cycle (with a countdown ring) or a deadline (`startsAt`) |
| Spikes | Always deadly. Hitboxes are forgiving |
| Sequence panel | Solved once its inputs switch on in the shown order *on the timeline*; a wrong input resets it |
| Exit | Completes the level when you reach it while it is open |
| Conveyor belt *(Clockwork Foundry)* | Solid belt that carries anyone standing on it. It can be powered or reversed by a condition. Idle ghosts keep riding it |
| Shutter *(Clockwork Foundry)* | A door on a fixed open/shut timetable. The ring above it counts down |
| Bounce pad *(Drowned Observatory)* | Launches anyone who lands on it a set number of tiles high. It can be powered by a condition. Steer in mid-air |
| Portal *(Drowned Observatory)* | Moves you to its partner and keeps your momentum. It can be powered by a condition, and it ignores screens |
| Echo screen *(Neon Spire)* | Cyan screens block ghosts only; gold screens block only you. A ghost replaying you pushing at a gold screen walks through it |
| Crumbling floor *(Event Horizon)* | Each tile breaks half a second after anyone first stands on it, and stays broken for the rest of the loop |

## Levels

All 75 levels have a scripted solution. Tests verify that each one completes, finishes at least one second before the time limit, can't be solved by the final run alone, and replays deterministically. The browser tests also play every solution in real time through the actual game, one world per test.

### Echo Labs — levels 1–15

*Where the loop begins.* New here: Plates, switches, doors, lifts, keys, lasers, sequences.

| # | Level | Difficulty | Loop | Ghosts | Objective | Intended solution |
|---|---|---|---|---|---|---|
| 1 | The First Loop | 1/10 | 10s | 1 | Hold the plate open with your past self, then walk out. | Record one attempt standing on the plate. In the next loop the ghost holds the door open while you walk to the exit. |
| 2 | Hold the Door | 1/10 | 12s | 1 | The plate is far from the door. Your ghost has to climb up — and stay. | Climb the terraces to the plate and end the attempt there. Next loop, wait at the door for the ghost to arrive, then exit. |
| 3 | Two Places at Once | 2/10 | 12s | 1 | One switch, two doors. Be on the right side of both at the right moment. | Record flipping the switch a few seconds in. Next loop, slip through the first door before the ghost flips it, then walk through the second door once it opens. |
| 4 | The Moving Platform | 2/10 | 14s | 1 | The lift only climbs while its plate is held. Ride it to the top. | Record standing on the far plate. Next loop, board the lift before the ghost arrives; it carries you up to the exit ledge. |
| 5 | The Locked Route | 2/10 | 16s | 1 | The plate is locked away and the key is far. Send yourself on an errand. | Record a run that fetches the key, unlocks the alcove and holds the plate. Next loop, wait at the exit door for the ghost to finish its errand. |
| 6 | The Second You | 2/10 | 12s | 2 | Two doors, two plates, one of you. Build a chain of ghosts. | Ghost 1 holds the first plate; ghost 2 passes the first door and holds the ledge plate; you walk through both doors. |
| 7 | Don't Waste a Second | 3/10 | 8.5s | 1 | The plate is a long climb away and the clock is short. Neither of you can dawdle. | A fast, clean ghost run to the top-left plate, then an immediate dash through the door and up the terraces. |
| 8 | The Wrong Order | 3/10 | 12s | 2 | The panel wants its plates pressed in order. The timeline decides what "first" means. | Ghost 1 drops into the far pit early; ghost 2 waits, then drops into the near pit; you press the final plate last and leave. |
| 9 | The Dangerous Shortcut | 3/10 | 12s | 1 | One plate turns the first laser off — and the second one on. Time the hand-off. | The ghost holds the plate (first laser off) and later steps off (second laser off). You pass each laser in its window, then time the blinking one. |
| 10 | Three of a Kind | 3/10 | 12s | 2 | The heavy plate needs two bodies. You make three. | Record two ghosts on the heavy plate. On the third run, board the lift before the second ghost arrives. |
| 11 | The Disappearing Bridge | 3/10 | 14s | 2 | The button keeps the bridge alive for two seconds. The walk takes longer. | Ghost 1 keeps re-arming the button, ghost 2 holds the mid-bridge plate, and you walk across both spans. |
| 12 | The Key Is Not Yours | 3/10 | 14s | 1 | Two keys on one road. Decide which of you carries which — and who gets there first. | Delay the ghost so you reach the amber key first, and jump over the jade key so the ghost can use it on the upper lock. |
| 13 | The Last Safe Moment | 4/10 | 12s | 2 | At 6 seconds the furnace lights. Everything has to happen before then. | Ghost 1 holds the furnace plate until the furnace lights; ghost 2 races to the switch. You slip through both doors in the gap between those two moments. |
| 14 | No Room for Mistakes | 4/10 | 12s | 2 (max 2) | Three doors, three plates — and only two ghost slots. | Ghost 1 holds the first plate, then moves to the second once you are through. Ghost 2 takes your route and holds the third plate. |
| 15 | Against Yourself | 4/10 | 15s | 2 (max 3) | Every mechanism you have met — and every version of you can ruin it. | Ghost 1 runs the lift. Ghost 2 rides up, leaves the key alone and flips the switch. You ride up, take the key, ride the lift down when ghost 1 lets go, and press the last plate after the switch. |

### Clockwork Foundry — levels 16–30

*Belts, shutters and borrowed seconds.* New here: Conveyor belts and timed shutters.

| # | Level | Difficulty | Loop | Ghosts | Objective | Intended solution |
|---|---|---|---|---|---|---|
| 16 | Assembly Line | 4/10 | 12s | 2 | The belt runs the wrong way and feeds the spike pit. Make it carry you instead. | Ghost 1 reverses the belt, ghost 2 rides it to the ledge plate that opens the door, and you ride straight through. |
| 17 | Shift Change | 4/10 | 12s | 2 | Shutters open on their own clock. The door needs both plates held. | Ghost 1 holds the start plate, ghost 2 slips through the first shutter to the step plate, and you time both shutters to reach the door. |
| 18 | Overtime | 4/10 | 10s | 2 | Ride out for the key, ride back to the lock. Someone has to work the switch twice. | Ghost 1 holds the door plate. Ghost 2 flips the lever out and back. You ride out for the key and ride the reversed belt home to the lock. |
| 19 | Piecework | 5/10 | 10s | 2 | One lever flips both belts. Flip it too early and you strand your own past self. | Ghost 1 rides the upper belt to the plate before ghost 2 flips the lever; then the lower belt carries you to the open door. |
| 20 | Punch Clock | 5/10 | 6.5s | 2 | Two plates behind two shutters, in a fixed order — faster than one of you can manage. | Ghost 1 takes the right plate in the right shutter’s first window, ghost 2 the left plate in the left shutter’s second window; you wait at the exit. |
| 21 | Quality Control | 5/10 | 10s | 2 | One plate swaps two lasers. The belt underfoot will not let you stand and wait. | Ghost 1 holds the laser plate and lets go later; ghost 2 holds the door plate between the lasers; you fight the belt in between. |
| 22 | Spare Parts | 5/10 | 10s | 2 | The key is at the far end of the belt. Your errand runner needs the belt both ways. | Ghost 1 runs the belt outward, then lets go; ghost 2 fetches the key, rides home and holds the locked plate; you wait at the far door. |
| 23 | Hot Metal | 5/10 | 10s | 2 | The furnace by the door lights at 6s. The shutter to the plate opens at 4s. | Ghost 1 reverses the belt, ghost 2 catches the 4-second shutter window to hold the door plate, and you slip past the furnace before it lights. |
| 24 | Gear Train | 5/10 | 12s | 2 | Three belts, three plates in the booth above. Work them in order as the riders go. | Ghost 1 works the booth plate by plate; ghost 2 rides the belts to the door plate; you ride behind and walk out. |
| 25 | The Foreman | 6/10 | 11s | 3 | The heavy plate turns the belt — but it sits at the far end of a long climb. | Two ghosts take the long upper route to the heavy plate; a third rides the turned belt to the door plate; you ride out. |
| 26 | Double Shift | 6/10 | 12s | 3 | The lift needs two on its plate, the top door needs one more — and every room has a shutter. | Two ghosts fill the heavy plate behind the left shutter; a third holds the top door plate behind the right shutter; you ride the lift. |
| 27 | Bill of Lading | 6/10 | 11s | 2 | Two keys lie at the end of the line. Each of you may only take the one you need. | Ghost 1 runs the belt; ghost 2 takes only the amber key home along the top belt and holds the cubby plate; you collect the jade key and leave. |
| 28 | Blast Furnace | 6/10 | 11s | 3 | The bridge belt only stops while its button glows, the furnace lights at 6s, and the door needs both ends held. | Ghost 1 keeps the bridge belt halted, ghost 2 holds the far plate, ghost 3 the near one, and you cross before the furnace. |
| 29 | Tight Tolerances | 6/10 | 11s | 2 (max 2) | Three plates, two ghost slots. One of you has to change jobs mid-shift. | Ghost 1 holds the door, then turns the belt; ghost 2 rides to the far plate; you follow through both doors. |
| 30 | Foundry Heart | 6/10 | 11s | 2 (max 2) | Belt, shutter, panel, lift and lock — with only two ghosts to run them. | Ghost 1 flips the belt, then takes the shutter plate second; ghost 2 vaults the key and takes the far plate first; you ride the lift up with the key. |

### Drowned Observatory — levels 31–45

*Springs and gates beneath the tide.* New here: Bounce pads and portals.

| # | Level | Difficulty | Loop | Ghosts | Objective | Intended solution |
|---|---|---|---|---|---|---|
| 31 | Low Tide | 6/10 | 10s | 2 | A spring sits in the floor, dead until its plate is held. The exit is far above. | Ghost 1 powers the spring, ghost 2 springs up to hold the ledge plate, and you spring up and walk out. |
| 32 | Through the Glass | 6/10 | 10s | 2 | The door plate is sealed in the observatory. Only the portal reaches it — while it has power. | Ghost 1 powers the portal, ghost 2 travels through it to the sealed plate, and you walk out the door. |
| 33 | Spring Tide | 6/10 | 10s | 2 | The key is in a walled garden. Spring in, portal out, and find the door held open. | Ghost 1 powers the spring, ghost 2 holds the door plate, and you spring into the garden, take the key and portal back to the exit. |
| 34 | Pressure Hull | 6/10 | 10s | 2 | One button wakes the portal for two seconds — and lights the laser behind you. | Ghost 1 presses the button late, ghost 2 holds the hull door plate, and you wait at the portal past the laser. |
| 35 | Sounding Line | 6/10 | 10s | 2 | Three plates, one order: the spring perch, the sealed cell, then the step on your own climb. | Ghost 1 springs to the perch, ghost 2 waits before portalling into the cell, and you press the climb plate last. |
| 36 | Bathysphere | 7/10 | 10s | 3 | The exit listens to a heavy plate inside a sealed lab. The portal there is powered from a perch. | Ghost 1 powers the portal from the perch; ghosts 2 and 3 portal into the lab to weigh the heavy plate; you walk out. |
| 37 | Undertow | 7/10 | 10s | 2 | The spring shaft is capped by a hatch that opens for a moment and a half — far from where you stand. | Ghost 1 opens the hatch late; ghost 2 and you wait bouncing in the shaft, fly up through it, and split left and right. |
| 38 | Pearl Diver | 7/10 | 10s | 2 | The vault holds your key — and the only way to the door plate runs right past it. | Ghost 1 powers the vault portal; ghost 2 vaults the key on its way to the door plate; you take the key and portal home. |
| 39 | Echolocation | 7/10 | 10s | 3 | Both portals feed sealed cells. The panel wants the far cell, then the near one, then you. | Ghost 1 powers the portals, ghost 2 lights the far cell, ghost 3 waits before lighting the near cell, and you finish the order. |
| 40 | Riptide | 7/10 | 10s | 2 (max 2) | The belt needs its plate, the spring needs its own — and you only have two ghosts. | Ghost 1 holds the belt plate while the riders cross, then moves to the spring plate; ghost 2 springs onto the perch plate; you spring up and walk out along the top. |
| 41 | Pressure Drop | 7/10 | 10s | 3 | A laser seals the spring shaft at 5 seconds. The spring wakes late. Everyone has to fly in between. | Ghost 1 opens the gate, ghost 2 wakes the spring, ghost 3 springs up to the upper plate in the window, and you follow before the shaft seals. |
| 42 | Changing Currents | 7/10 | 10s | 2 | One lever decides which portal works. Flip it at the wrong moment and someone is stranded. | Ghost 1 portals left to the door plate before ghost 2 flips the lever; then the right portal carries you to the exit room. |
| 43 | Abyssal Plain | 7/10 | 10s | 3 (max 3) | Four plates to hold and only three ghost slots. The portal and the spring are never needed at once. | Ghost 1 powers the portal, then the spring; ghost 2 portals to the sealed door plate; ghost 3 springs onto the perch plate; you walk through both doors. |
| 44 | Tidal Lock | 7/10 | 10s | 3 | The lab’s heavy plate opens your door. The portal into the lab wakes for two seconds — lighting a laser behind whoever waits there. | Ghost 1 presses the button late; ghosts 2 and 3 wait at the portal past the laser and weigh down the lab plate; you wait at the door. |
| 45 | Leviathan | 7/10 | 10s | 2 (max 2) | Key in the vault, a panel that wakes the spring, a locked exit — and two ghost slots. | Ghost 1 powers the vault portal, then presses the panel’s second plate; ghost 2 vaults the key to press its first plate; you take the key and ride the woken spring. |

### Neon Spire — levels 46–60

*Some walls stop only ghosts — and some only you.* New here: Echo screens: cyan stops ghosts, gold stops you.

| # | Level | Difficulty | Loop | Ghosts | Objective | Intended solution |
|---|---|---|---|---|---|---|
| 46 | Neon Gate | 7/10 | 10s | 2 | A cyan screen stands between the plate and the door. You pass it. Your past self does not. | Ghost 1 holds the first door. Ghost 2 replays a plain walk to the exit and gets stopped by the screen right on the plate. |
| 47 | Afterimage | 7/10 | 10s | 2 | A gold screen blocks the upper hall. Push against it anyway — your echo will keep walking. | Ghost 1 holds the first door. Ghost 2 is a recording of you pushing against the gold screen; replayed, it walks through and on to the far plate. |
| 48 | Static | 7/10 | 11s | 2 | Your ghost needs the locked room. The key hides where ghosts cannot go. | Ghost 1 pushes against the lock; you fetch the key from behind the screen and unlock it, and ghost 1 stumbles onto the plate. Ghost 2 holds the middle plate. |
| 49 | Signal Loss | 8/10 | 10s | 3 | One plate sits behind a cyan screen, the other behind a gold one. The door upstairs needs both. | Ghost 1 powers the portal, ghost 2 portals behind the cyan screen, ghost 3 is your push against the gold screen replayed through it; you climb to the exit. |
| 50 | Crosstalk | 8/10 | 10s | 2 | Three plates in order: behind the gold screen, in the open, behind the cyan screen. Only one of them can be yours. | Ghost 1 is your push replayed through the gold screen to its plate, ghost 2 takes the open plate second, and you press the cyan-screened plate last. |
| 51 | Night Market | 8/10 | 10s | 2 | Two belts run into two cyan screens. Whatever stands still on them ends up on the plates. | Two short recordings: each ghost just steps onto a belt. The belts carry them into the screens, pinned on both plates. |
| 52 | Blind Spot | 8/10 | 10s | 2 | The button for the bridge is past a gold screen. You can never touch it — but you can program who does. | Ghost 1 is a blind recording: pushing and pressing at the gold screen, replayed it walks to the button and keeps the bridge alive. Ghost 2 holds the exit door. |
| 53 | Dead Pixel | 8/10 | 10s | 2 | A laser lights at 4s right where ghosts pile up against the screen. Your door opens later. | Ghost 1 opens the first door; ghost 2 stops on the safe half of the plate instead of drifting into the laser; you pass the late shutter. |
| 54 | Uplink | 8/10 | 11s | 2 | The lift rises when its heavy plate fills — and ghosts walking for the key pile up right on it. | Two ghosts replaying walks to the lift pin themselves on the heavy plate, the second one late; you grab the key and are aboard before it fills. |
| 55 | Feedback Loop | 8/10 | 11s | 2 | The panel wants the plate past the gold screen, then the belt plate, then yours past the cyan screen. | Ghost 1 is your push replayed past the gold screen to the first plate; ghost 2 boards the belt late and is delivered to the second; you press the third. |
| 56 | Firewall | 8/10 | 10s | 3 (max 3) | Four plates, three ghost slots: the gate, the screen plate, the gold-screen plate and the spring. | Ghost 1 holds the gate, then wakes the spring; ghost 2 is pinned on the screen plate; ghost 3 is your gold-screen push replayed onto the far plate; you spring to the exit. |
| 57 | Blackout | 8/10 | 10s | 3 | At 7 seconds a laser seals the corridor. Two doors stand before it, each waiting on a different kind of ghost. | Ghost 1 opens the gate, ghost 2 rides the belt into the cyan screen, ghost 3 is your gold-screen push replayed; you sprint through before the corridor seals. |
| 58 | Rooftop Run | 8/10 | 10s | 3 | Springs fling you across the rooftops. On the last roof a belt runs into a cyan screen. | Ghost 1 powers the first spring, ghost 2 holds the middle-roof plate, ghost 3 is delivered by the belt to the screen plate; you cross all three roofs. |
| 59 | Mirror Maze | 8/10 | 10s | 3 | Three booths, three portals: one in the open, one past a gold screen, one past a cyan screen. The panel wants them in that order. | Ghost 1 powers the middle portal, ghost 2 takes it to the first booth plate, ghost 3 is your gold-screen push replayed into the second booth; you take the cyan-screened portal to the last plate and the exit. |
| 60 | Spire Apex | 8/10 | 11s | 3 (max 3) | The lift climbs once the panel is solved — and the lift floor is the panel’s last plate. | Ghost 1 opens the gate, ghost 2 is your gold-screen push replayed, ghost 3 boards the belt late; you take the key and step onto the lift last, which solves the panel and lifts you to the exit. |

### Event Horizon — levels 61–75

*The floor forgets. You must not.* New here: Crumbling floors — and everything at once.

| # | Level | Difficulty | Loop | Ghosts | Objective | Intended solution |
|---|---|---|---|---|---|---|
| 61 | Event Horizon | 8/10 | 10s | 2 | The bridge crumbles half a second after anyone steps on it. Your ghost needs to cross. So do you. | Ghost 1 opens the gate; ghost 2 crosses to the door plate; you cross in step with it before the tiles fall. |
| 62 | Spaghettification | 8/10 | 10s | 3 | The heavy plate lies at the bottom of the pit under the crumbling floor. You need it held — from the far side. | Ghost 1 opens the gate. You cross the crumbling floor first; ghosts 2 and 3 leave late and fall through onto the heavy plate. |
| 63 | Accretion | 8/10 | 10s | 3 | Two pits lie under crumbling floors. The panel wants the far pit first, the near pit second, then the last plate. | Ghost 1 opens the gate, ghost 2 crosses and drops into the far pit, ghost 3 waits before dropping into the near pit, and you press the last plate. |
| 64 | Redshift | 9/10 | 10s | 2 | Cross the crumbling floor in the first shutter window. Your ghosts must take the second — and fall. | You cross in the first shutter window, breaking the floor; two ghosts come through the second window and fall onto the heavy plate just in time for you to beat the laser. |
| 65 | Photon Ring | 9/10 | 10s | 2 | The door plate sits on a perch that crumbles half a second after someone lands on it. | Ghost 1 powers the spring; ghost 2 lands on the crumbling perch at a chosen moment; you wait pressed against the door and slip through the half-second it is open. |
| 66 | Hawking Radiation | 9/10 | 10s | 2 | The portal drops you onto a ledge that falls away half a second after the first arrival. | Ghost 1 powers the portal; ghost 2 and you step through together before the landing ledge falls; ghost 2 holds the door plate. |
| 67 | Frame Dragging | 9/10 | 10s | 3 | The belt drags anyone idle into the first pit. The panel wants that pit, then the heavy second pit, then you. | Ghost 1 rides the belt into the first pit; ghosts 2 and 3 wait, then drop into the heavy second pit; you crossed both floors first and press the last plate. |
| 68 | Tidal Forces | 9/10 | 10s | 3 | A cyan screen stands over a crumbling floor. Ghosts that pile up against it fall through — onto the plate below. | Ghost 1 opens the gate, ghost 2 is pinned by the screen and falls onto the pit plate, ghost 3 is your gold-screen push replayed; you sprint through before the laser. |
| 69 | Gravitational Lens | 9/10 | 10s | 3 | Fetch the key past the cyan screen, then be at the door the instant a ghost lands on the crumbling perch. | Two ghosts power the spring; a third lands on the crumbling perch late; you collect the key and wait at the door for its half-second opening. |
| 70 | Ergosphere | 9/10 | 10s | 2 (max 2) | A gate, a crumbling bridge, a door and a spring — run by only two ghosts. | Ghost 1 holds the gate and then wakes the spring; ghost 2 crosses in tandem with you to hold the door plate; you spring up to the exit. |
| 71 | Singularity | 10/10 | 10s | 4 | A gate, a hard-light bridge that fades without its button, and a heavy plate under a crumbling floor. | Ghost 1 holds the gate, ghost 2 relays the bridge button, you cross and break the floor, ghosts 3 and 4 follow later and fall onto the heavy plate. |
| 72 | Penrose Process | 10/10 | 10s | 3 | The booth plate first, then the pit plate under the crumbling floor, then yours. | Ghost 1 powers the portal, ghost 2 lights the booth plate, ghost 3 drops into the pit you opened, and you press the last plate. |
| 73 | Light Cone | 10/10 | 10s | 3 | Four plates, one order: past the gold screen, at the cyan screen, in the pit, and yours. | Ghost 1 is your gold-screen push, ghost 2 boards the belt after it, ghost 3 drops into the pit you broke, and you press the last plate. |
| 74 | No Hair | 10/10 | 10s | 2 (max 2) | Gate, crumbling bridge, cyan screen, door, spring and lock — and only two ghosts. | Ghost 1 holds the gate and then wakes the spring; ghost 2 crosses in tandem and holds the door plate; you take the screened key and spring up to the lock. |
| 75 | The Last Loop | 10/10 | 12s | 3 (max 3) | Everything you have learned, in one room — and the lift floor is the last plate of all. | Ghost 1 opens the gate, ghost 2 is your gold-screen push replayed, ghost 3 crosses the bridge with you and boards the belt late; you take the key and step onto the lift last. |

Stars: 3 for finishing within par with no hints; one star off for using any hints, another for revealing all three, and another for going over par (minimum 1).

## Architecture

```
src/
  game/            Pure, deterministic simulation (no DOM)
    constants.ts   Tile size, fixed 60 Hz tick, movement tuning
    input.ts       Input bitmask (left/right/jump/use)
    recording.ts   Attempt = timestamped input-change events (+ dense lookup)
    world.ts       One attempt: characters, physics, collisions, every puzzle object
    session.ts     The time loop: ghosts, timer expiry, Loop Now, restarts, death
    level.ts       ASCII map parser and validator
    phases.ts      The five worlds: names, themes, level ranges
    solution.ts    Script bot used to verify solutions (emits ordinary input bits)
    levels/        The 75 level definitions (Echo Labs one file per level, later worlds one file each)
  engine/          Browser glue
    controller.ts  rAF loop with a fixed-timestep accumulator, input sampling, events → sound/FX, HUD store
    renderer.ts    Canvas 2D renderer (themed static layer and backdrop, ambient effects, interpolation, particles, transitions)
    themes.ts      Per-world palettes, backdrop art, ambient effect and music chord
    worldScene.ts  Animated key art for each world (world picker banner and title card)
    input.ts       Keyboard + touch → per-tick bits (short taps are latched)
    audio.ts       Procedural WebAudio sound effects and ambient pad
  ui/              React screens: menu, level select, how to play, settings, HUD, pause, hints, results, touch pad
  save/            localStorage persistence with validation
e2e/               Playwright browser tests
scripts/           Level-design aids: trace, step-by-step debug, README table
```

**Determinism.** The simulation runs only in whole 60 Hz ticks, kept separate from render frames; the renderer interpolates between ticks. An attempt is stored as the player's input bits per tick, encoded as change events, never as positions. Each loop rebuilds the world from the level definition and re-simulates every ghost from its inputs through the same `World.step`. Ghosts are processed first, then the player, in a fixed order. The simulation uses no randomness and no trigonometry. Frame deltas are capped at 100 ms and the game auto-pauses when the page is hidden, so a suspended tab can't use up the time limit.

**React and canvas separation.** `GameController` owns the simulation and the canvas. React subscribes to a small HUD snapshot through `useSyncExternalStore`, and that snapshot changes at most every tenth of a second.

## Level format

Levels are 24×14 ASCII maps plus a legend (`src/game/levels/levelNN.ts`):

```
#  wall        ^  spikes       -  one-way ledge
S  spawn       E  exit         letters → legend objects (a cell group = one object)
```

Legend entries use the object types listed above. Conditions are strings such as `'a'` and `'!a'`, or `{ all: [...] }` / `{ any: [...] }`. An object can be given an explicit `at: [col, row, w, h]` when it overlaps another object, for example a laser across a plate. The level's `solution` is a list of attempts written in a small script language (`go 5`, `jump 8`, `hold 14 5.1`, `enter 9`, `rise 5`, `wait 1.5`, `until 4`, `land`, `use`, `end`, `expire`). It runs through a real `LevelSession`, so a passing solution is a real input sequence.

To see a level's timeline and map snapshots while designing:

```bash
LEVEL=8 npx vitest run --config scripts/vitest.trace.config.ts scripts/trace.test.ts
LEVEL=8 EVERY=10 npx vitest run --config scripts/vitest.trace.config.ts scripts/debug.test.ts
```

## Testing

- **Unit tests** (`npm test`, 383 tests): recording order and playback; movement, jumping, gravity, collision, ceilings, one-way ledges and hazards; plates (including weight), switches (toggle and timed), doors (plain, inverted, all/any), keys and locks (pickup, colour, first-come, jumping over, persistence), moving platforms (powered, return, carrying, shuttling), lasers (cycle, condition, deadline), sequences (order and reset), exit conditions; timer expiry, ghost timing, ghost idling, Restart Attempt, Restart Level, death, multi-ghost synchronisation, ghost slot limits; belts, shutters, pads, portals, echo screens and crumbling floors; all 75 level solutions with timing margin, need-for-ghosts and determinism checks; the world structure (five worlds of 15, difficulty never dropping, each world harder on average and built on its new mechanic); save, restore, corruption handling and validation.
- **Browser tests** (`npm run test:e2e`): main menu buttons, World Map and settings persistence; phone-landscape layouts on a Pixel 7 and an iPhone SE sized screen (menu fits without scrolling, all worlds on the map, controls at least 44px and never overlapping the room, pause and results fit) and the rotate prompt in portrait; New Game confirmation; starting, moving and jumping; recording a ghost, Restart Attempt and Restart Level; interacting with a switch; pause and hints not resetting the puzzle; completing Level 1, the results screen, Next Level and progress surviving a reload; touch controls on a phone viewport (target sizes, move, jump, pause); and **all 75 level solutions played in real time through the actual game loop and UI**, including the transitions between worlds.

The `?e2e` URL flag exposes a read-only test handle (`window.__pastSelf`) and a hook that replays a level's verified solution. Normal play never uses them.

## Save data

The save is stored in `localStorage` under `paradox-sequence.save.v1` (a save from the game's earlier name is picked up automatically). It holds unlocked levels, completed levels with best time, best stars and fewest hints, the last level played, and settings. Every field is validated on load; corrupted or missing data falls back to defaults, and a storage failure never crashes the game. Refreshing the page during a level restarts that level; in-progress ghost recordings are not saved.

## Settings

Master, sound effect and music volume; ghost route trails; confirmation before Restart Level; reduced motion (no particles, flicker, bobbing or shake); high contrast (opaque ghosts and brighter edges); touch controls (Auto, Always or Never).
