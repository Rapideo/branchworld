# BranchWorld Engine — From Vision to Proof

### A Leadership Briefing on What We Built, Why It Matters, and Where We're Headed

*Prepared June 17, 2026 · Mid-level overview, light on jargon · Full read ~60–75 minutes — or skim the Executive Summary, the two "In Their Own Words" interludes, and the live demo links*

---

## A Moment, First

Picture a rain-slick night in Vienna, 1971. You are a green courier on your first solo job, and you have six hours to walk a frightened defector out of the city before the last neutral train leaves at 2:10 in the morning. Your handler gives you a satchel and a smooth story. Somewhere across the city, a woman waits in a coffeehouse with something sewn into her coat that the world should not have. And down by the black water of the Danube Canal, at half past eleven, a man you've never met will stand at a particular bollard and hand a film canister to someone — **whether you are there to see it or not.**

If you go to the canal in time, you witness who really receives the film, and it changes everything you thought you understood about the night. If you're across town when the clock hits 11:30, the handoff happens anyway, the world moves on without you, and you spend the rest of the night piecing together what you missed from chalk marks left on the concrete.

That is not a cutscene. That is not a scripted "if-then" the writer hand-wired into one specific button. That is a *living world running on a clock* — an event that fires on time, reacts to where you actually are, and reshapes the story based on the sum of everything you've done. And as of this week, **you can play it in a web browser on your phone.**

This document is the story of how we got here: what we set out to build, how we tested the idea before committing to it, the uncomfortable thing that testing revealed, how we fixed it, and what we've actually constructed over the last few days. It's also an honest accounting of how far we still have to go.

The short version: **the single most doubted part of this whole vision — that a story can branch on *everything you've done* and genuinely *feel alive* rather than feeling like a spreadsheet — is no longer a hope. It's running code. We proved it.**

---

## Executive Summary

For the reader who wants the bottom line before the full story:

- **The vision.** We're building **BranchWorld**, a narrative game engine where stories branch not just on the choices you tap ("A, B, or C"), but on *world state*: where you are, what time it is, what you know, who trusts you, what you missed, and what the world is doing in the background. Think *Choose Your Own Adventure* crossed with *Oregon Trail* and *Carmen Sandiego* — the feel of a living world, without the cost of building a full 3D open-world game.

- **We tested before we built.** Rather than assume the idea would work, we ran an adversarial experiment: **three independent AI design teams**, each with a designer, a writer, and a playtester, each built and stress-tested a complete opening chapter against our first design. They produced three genuinely excellent, atmospheric games — a hurricane-evacuation thriller, an island murder mystery, and a Cold War Vienna defection.

- **The test revealed a precise, fixable flaw.** All three teams, working in total isolation, hit the **same four structural failures.** That convergence was the most valuable result we could have gotten: it told us the problem wasn't the teams — it was that our original design made those failures the *path of least resistance.* The one feature the engine *forced* authors to wire correctly was the one feature that worked in all three and made every playtester say the world "felt alive."

- **We rewrote the foundation around one principle.** *The engine enforces its own promises; the author cannot silently break them.* Anything we'd left to author discipline became a built-in engine rule plus an automated **"linter"** — a safety check that **blocks a broken story from shipping** the same way a spell-checker won't let a typo through.

- **We built it, and it works.** Over roughly two days, across **49 commits and 105 automated tests**, we built the hardened engine, a playable mobile web player, ported one of the test chapters onto the new engine to prove the thesis end-to-end, and built a visual flow-graph view of any story. **You can play it right now.** The clock genuinely bites, the timed event fires whether you're present or absent, and endings emerge from the accumulated state of your whole playthrough — exactly the things that were broken before.

- **The honest gap.** What's proven is the *engine*. What's not yet built is the *authoring suite* that would let a non-programmer write these stories without touching code. Today, authoring still means writing structured data by hand. Closing that gap — and attacking the real bottleneck, which is the *cost of authoring* this much reactivity — is the road ahead.

**Where we are, in one line:** the riskiest, most-doubted part of the dream is real and playable; what remains is the (large but lower-risk) work of turning a proven engine into a product writers can use.

---

# Part I — The Vision: What We're Actually Building

## The problem with "branching" stories

Most interactive stories — the classic *Choose Your Own Adventure* book, the typical "branching" mobile game — share a hidden limitation. They branch only at the moment you make a choice. You read a page, you pick option A or B, and you flip to the page that option points to. The story is a tree of pre-written pages, and your only influence is which fork you take at each junction.

That can be charming. But it has a ceiling, and players feel it quickly. The world doesn't *remember* much. Time doesn't really pass. Nothing happens unless you press a button. The character who trusted you on page 12 has no idea you betrayed someone on page 9 unless the author manually wired that exact connection. The "world" is really just a stack of bookmarks.

We wanted something that feels fundamentally different. Our founding idea, stated as plainly as we could put it:

> The story does not branch only when the player chooses "A, B, or C." The story branches because of **what the player has done, where they went, when they went there, what they know, who trusts them, what they missed, and what the world is doing in the background.**

## A living world, not a deeper tree

The reference points we keep coming back to are telling: the dread and choice of *Choose Your Own Adventure*; the resource-and-time pressure of *Oregon Trail*; the investigate-and-deduce loop of *Carmen Sandiego*; the cinematic tension of interactive movies. What all of those have in common is that the world feels like it has its own life. The river is rising whether or not you're ready. The suspect is in a different city by the time you get the warrant. The clock is the enemy.

BranchWorld is an engine designed to make that kind of reactivity *the default*, not a heroic feat of hand-wiring by the author. We want a writer to be able to say things like:

- "This scene appears only if the player knows about the envelope, arrives at the diner before 4:10, and the diner owner still trusts them."
- "At 4:10 PM, the envelope gets picked up — whether or not the player is there to see it. If they miss it, leave a clue they can find later."
- "How the night ends depends on the total of everything: who trusts you, what you're carrying, what you witnessed, and how much time you have left."

…and have the engine make all of that *true and consistent* automatically, rather than leaving it as a fragile promise the writer has to keep by sheer discipline.

## What "state-driven" means, in plain terms

The technical heart of this is a single idea we call **world state.** As you play, the engine keeps a running ledger of everything that matters: the current time (a real clock that advances as you act), where you are on a small map, what clues you've found, what you know, your relationships with characters, what you're carrying, and which events have already happened. Every scene, every available choice, and every ending can be gated on that ledger.

That's the difference between a branching book and a living world. In a branching book, the only thing that "remembers" is which page you turned to. In BranchWorld, the *entire accumulated state of your playthrough* is what the story reacts to — continuously, not just at decision points.

## Two products in one

From the start, BranchWorld has really been **two things that share one brain:**

1. **The player** — the polished, mobile-friendly experience where someone actually reads the scenes, makes choices, moves around the map, watches the clock, collects clues, and reaches an ending.
2. **The authoring tool** — the workshop where a writer builds the story: the scenes, the branches, the conditions, the consequences, the locations, the variables, the timed events.

The crucial design decision — and we'll come back to why it matters enormously — is that both of these run on the *exact same engine.* The thing that decides what the player sees is the same thing the authoring tool uses to preview and check the story. There is no separate "preview mode" that can drift out of sync with the real game. One brain, two faces.

## Why we believe this is worth doing

A full open-world video game costs tens of millions of dollars and years of work. A branching text game is cheap but shallow. BranchWorld is a bet that there's an enormous, underserved space *in between*: interactive fiction that feels genuinely reactive and alive — where your choices, your timing, your knowledge, and your relationships all visibly matter — but that a small team can actually produce. The engine is genre-neutral by design (mystery, survival, espionage, coming-of-age, horror, historical, educational), so one investment in the engine pays off across many possible titles.

That's the dream. The rest of this document is about whether the dream survives contact with reality — and what we did when it didn't, at first.

---

# Part II — The Discipline of Not Building Yet

## We could have just started coding. We didn't.

There's a strong temptation, when you have an exciting idea, to immediately start building it. We deliberately resisted. The reason is simple: the *concept* of state-driven branching is easy to describe and easy to fall in love with. The hard question — the one that determines whether this is a real product or a clever-sounding dead end — is much subtler:

> **Does it actually *feel* like a living world to a player? Or does it just feel like a spreadsheet with a story painted on top? And — just as important — is it realistic for a writer to actually author this much reactivity without losing their mind?**

You cannot answer that question by staring at a design document. You have to put the design in front of real creative work and see what breaks. So before we wrote a single line of engine code, we ran an experiment.

## The triple-team method

We took our complete first-draft design document — the original specification for how BranchWorld would work — and we handed it to **three completely independent design teams.** Each team had three roles working in sequence:

- a **designer**, who invented an original story concept and mapped out its structure, locations, characters, variables, and timed events using only the tools the design document provided;
- a **writer**, who wrote the actual prose — the scenes, the dialogue, the atmosphere;
- a **playtester**, who then played through the result adversarially, hunting for everywhere it broke, and delivered a blunt verdict: *go*, *go with changes*, or *too much, cut scope*.

These were AI agent teams, and that's worth pausing on, because it's part of what made this possible. Running three full design-write-playtest cycles, in parallel, in isolation, would normally take weeks of human effort and significant cost. We did it as a structured, repeatable experiment. Each team worked **blind to the other two** — none of them saw another team's story, choices, or findings. That isolation is the whole point: if three teams independently reach the same conclusion, that conclusion is about the *design*, not about any one team's taste or skill.

The teams didn't just produce critiques. They produced three complete, playable opening chapters — and the prose quality genuinely surprised us. These weren't placeholder games. They were good.

## The three games

### Team 1 — *The Last Bell at Pelican Reach*

A disaster-evacuation thriller set on a sinking Gulf-coast barrier town during the afternoon and evening of a Category 3 hurricane landfall. You play **Wren Okafor**, the county's only on-site emergency siren and flood-gate technician — the one person who knows the warning system is half-broken and the new automated flood gate is jammed. You have one six-hour tide window, from the first siren at 2:00 PM to the storm surge at 8:00 PM, and a single causeway out of town that floods and becomes impassable at 7:00. You can save the town, save a few people, or save the truth about who sabotaged the gate — but the clock and the tide will not let you do all three.

It's tense, salt-and-rust atmospheric, morally grey. Quiet dread punctuated by hard timed decisions. The kind of premise that lives or dies on whether the clock actually *means* something.

### Team 2 — *The Last Ferry from Vael Harbor*

An island murder mystery with a beautifully sophisticated emotional core. Its standout was a relationship system that actually *closed doors*: as the town's suspicion of you rises, a key location (the "Cold Room," where crucial evidence sits) literally seals itself off — but gracefully routes you to an alternative path rather than dead-ending you. And its most haunting ending was the one where you feel *fine* — you file the accident report in good faith, go home, and never learn how close you stood to the truth. A genuinely mature use of the difference between *what you know* and *what actually happened in the world.*

### Team 3 — *The Prater Line*

This is the Cold War Vienna defection you met in the opening of this document — and it became our reference implementation, so it's worth describing in full. It's a one-night espionage thriller in the John le Carré register: rain, cigarette smoke, mistrust, small human tells, quiet dread over action. You are **Cal Maddox**, 26, a brand-new CIA field courier on his first solo night. Your job sounds simple: collect a defecting Soviet physicist, **Irina Dragomir**, from a coffeehouse and put her on the 2:10 AM train west before the night is over.

Nothing about it is simple. You cannot tell from the prose alone who is being straight with you — your own handler Lindqvist, the frightened Dragomir, or the KGB resident Volkov who keeps appearing where he shouldn't. Trust is the only currency that matters, and you're short on time to spend it. The whole night turns on a single timed event — the canal-side document handoff at 11:30 PM — and an earned, gut-punch twist about who's *really* running the operation.

Here's how it opens:

> *Vienna, the night of 14 November 1971. Rain, and the smell of wet trams. You are Cal Maddox, twenty-six years old, four months trained, and tonight — for the first time — alone. A satchel waits on a table in a safehouse above a dead tailor's shop. A frightened woman waits in the back booth of a coffeehouse across the city, with something sewn into her coat that the world should not have. The last neutral train west leaves Westbahnhof at 02:10. You have six hours to walk her out of this city, and the only thing shorter than your time is your supply of people you can trust.*

And here's your handler, the moment that tells you not to trust him:

> *"It's clean," he says. "Cover passport, transit chit, the address. You go to Sperl, you collect the woman, you put her on the oh-two-ten west. Six hours, Cal. A long time to do a simple thing." He says simple the way other men say dangerous.*

This is publishable prose. The point is not that an AI wrote a competent thriller — it's that the *structure underneath it* is exactly the kind of reactive, state-driven story BranchWorld exists to make possible. Which is what made the next part so instructive.

## The one thing that worked everywhere

Before we get to what broke, it's important to note what *succeeded* — because it pointed directly at the solution.

In all three games, one feature worked beautifully and consistently: **clue-and-knowledge gating.** When the player examines a body, or searches a satchel, or reads a coded cable, the engine sets a "knowledge flag" — a fact the player now knows — and that flag *visibly unlocks sharper, smarter dialogue and new options later.* You can suddenly ask the question you couldn't have asked before, because now you know to ask it.

Every single team's playtester, working independently, called this out as **the moment the world felt alive.** Not "interesting." Alive. The part where it stopped feeling like flipping pages and started feeling like *being a detective in a world that responds to what you've figured out.*

Hold onto that, because it's the key to everything that follows.

---

# Part III — The Uncomfortable Discovery

## Three teams. One identical failure. Four times over.

When the three playtest reports came back and we reconciled them, we found something that was, frankly, a little uncomfortable — and then, on reflection, the best possible news.

**All three teams, working in complete isolation, shipped the exact same four structural failures.** Not similar failures. The *same* failures.

**1. The deadline could not actually run out.** Every story sold itself on a ticking clock — six hours, one tide cycle, the last train. And in every single one, the clock was *decorative.* The per-action time costs were set so low (an order of magnitude too cheap) that you could dawdle through the entire story, take every detour, and still finish with hours to spare. The train always waited. The "ticking clock" that titled and sold each premise was mechanically inert.

**2. To hide the broken clock, authors faked the time in the prose.** Because the real clock never created urgency, the writers — independently — started hardcoding fictional timestamps directly into the scene text to *manufacture* the tension the engine wasn't providing. Now there were two clocks: the engine's real (broken) clock, and the fictional clock in the prose. They disagreed. The result was an incoherent sense of time, where the story *says* it's 11:30 but the engine thinks it's barely 9.

**3. The "world moves without you" event was vaporware.** The marquee feature — the thing that most distinguishes this engine from a branching book — is the scheduled event that fires on its own schedule regardless of where you are. In all three games, this didn't actually exist as a real, time-triggered event. It was just an *optional choice in one scene.* The "if you're absent, the world changes and leaves you a clue" path — the thing that makes missing an event feel meaningful instead of like a dead end — was entirely unimplemented. The flagship reactivity feature was, in every chapter, a promise the prose made and the engine never kept.

**4. Endings were hand-wired to choices, not earned from state.** The whole emotional payoff of the design is "the ending emerges from the sum of everything you did." Instead, every team simply routed *specific choices* directly to *specific endings.* The consequence was the worst kind of immersion break: the fiction asserting things the underlying state flatly contradicted. In one game, a character ferries you to safety while *distrusting you completely.* In another, a failed, bungled run somehow falls through into the triumphant hero ending. The story tells you that you won, while the bookkeeping says you lost.

## Why this was the best possible outcome

Here's the thing. When three skilled, independent teams converge on the *identical* set of failures, you've learned something far more valuable than "those teams made mistakes."

You've learned that **the failures are not the teams' fault. They are the path of least resistance that the design itself creates.** Our original design *allowed* — even quietly encouraged — every one of these failures, because it left all four of these things to *author discipline.* It trusted the writer to calibrate the clock correctly by hand, to keep the prose clock and the engine clock in sync by hand, to implement the timed event correctly by hand, to wire endings to state by hand. And three out of three teams, doing their honest best, failed at exactly those four hand-wired tasks.

The proof was sitting right there in front of us. Remember the *one* feature that worked in all three games — the clue-gating that made everyone say "alive"? That was the one feature our original engine **forced** the author to wire correctly. It wasn't left to discipline. It was structural. So it worked. Every time.

The lesson wrote itself: **the four things that broke were the four things we'd left optional. Make them structural — make the engine enforce them — and they'll work as reliably as the clue-gating did.**

## The verdict

The reconciled verdict across all three teams was unambiguous: **GO WITH CHANGES.**

The concept was *proven.* The prose was strong, the scope was right-sized (each chapter was a completable 14-to-31-scene story), and the reactivity — when it worked — genuinely felt like a living world. But shipping any of those three games as written would have delivered *precisely* the "spreadsheet with no felt consequence" failure we were trying to avoid, three times over.

Crucially, the fixes were not rewrites. They were **calibration and wiring** — and, more deeply, a change in *who is responsible* for getting them right. The recommendation was explicit and a little counterintuitive: **do not fix the three broken chapters. Harden the engine first, so the engine makes these failures impossible — then re-run a chapter through the fixed engine to prove it.** Build the foundation that can't be built wrong, and the stories on top of it become trustworthy.

That recommendation is exactly what we did next.

---

# Interlude — In Their Own Words

The diagnosis in Part III can read like a cold autopsy: four failures, three teams, one root cause. But there were *people* behind that experiment — nine of them across the three teams (a designer, a writer, and a playtester each), plus the showrunner who read all three reports and reconciled them into a single verdict. They were our AI design teams, working in isolation, and what follows is composed from their working notes, their drafts, and their playtest reports, rendered as first-person reflections. (The names are ours, for readability.) We think it's worth hearing the experiment in their voices, because the *human* texture of how each one hit the same wall — from three completely different directions — is the most convincing evidence of all that the wall was real.

---

## Team 1 — *The Last Bell at Pelican Reach*

### Mara Okonkwo-Vance · Designer

> "When I first read the engine spec, the time-and-location system is what sold me. A real clock, travel costs between places, a hard deadline — I thought, *finally, a way to make a hurricane feel like a hurricane.* So I built the whole town around it: a six-hour tide window, a causeway that floods and locks the map at seven o'clock, sirens, the works. On paper it was a pressure cooker.
>
> The problem was that the spec let me *set the costs myself,* with nothing checking my math. I gave walking between districts ten minutes, a conversation five. They felt right in isolation. But I never sat down and added up the longest possible route against the six-hour budget — and nothing in the system made me. When the playtester finally walked it end to end, the 'pressure cooker' had three hours of slack in it. The tide I'd designed the whole game around was a backdrop, not a threat. The fix I asked for was the one I wished had been forced on me from the start: *make the engine compute the longest path and refuse to let me ship a clock that can't run out.* Don't trust the designer to do the arithmetic. I'm proof you can't."

### Tom Réti · Writer

> "I'll be honest, because I think the honesty is the useful part. I knew the clock felt weightless while I was writing. So I did what a writer does when the machinery isn't carrying the tension — I carried it myself, in the prose. 'The water's at the second step now.' 'Six-forty, and the light's going.' I wrote times *into* the scenes, hard, as if they were true, because the reader needed to feel the night closing in and the engine wasn't giving me that feeling to work with.
>
> It worked, line by line. It also quietly created a second clock — mine, the fictional one — that disagreed with the engine's real one. I was papering over a structural hole with atmosphere, and somewhere in the back of my mind I knew it. The change I most wanted, after the fact, was almost a relief to recommend: *take the clock away from me.* Don't let me type a timestamp. Give me a token that prints the engine's *real* time, so the only clock in the story is the one the player is actually racing. Make it impossible for me to lie about the time, and I'll write better, because I'll be writing against a constraint that's actually there."

### Dani Brooks · Playtester

> "Here's the moment I'll never forget. I played a careful, competent run — I got people out, I made the hard calls, I genuinely felt like I'd *saved the town.* And then the ending text told me, in beautiful prose, that the floodwater took the streets and the houses went under. The town drowned. Except… it didn't. Not in the bookkeeping. The flag that's supposed to mean 'the town flooded' was never set on my path. The story narrated a catastrophe the game's own state said never happened.
>
> That's the one that made it click for me. It wasn't a typo or a rough edge — it was the game *asserting an outcome its own memory contradicted.* As a player, that's the most immersion-shattering thing there is, worse than a bug, because it makes you feel like none of your choices mattered. I wrote it up plainly: *no scene, and especially no ending, should be allowed to claim something happened unless the flag for it is actually set on the path that got you there.* If the engine can't verify the claim, the engine shouldn't let the claim ship."

---

## Team 2 — *The Last Ferry from Vael Harbor*

### Priya Sundaram · Designer

> "My whole game was about a town that slowly stops trusting you. I built a real relationship lock: as the islanders' suspicion of you climbs past a threshold, the Cold Room — where the evidence is — *seals itself.* And I was proud of it, because I didn't dead-end the player; suspicion routing closed one door but opened another, the logbook, the cottage. That's the pattern I think the whole engine should aspire to: a closed door is a different path, never a wall.
>
> The cruel irony is that it almost never fired. Suspicion was *hard* to raise — by the time I'd tuned it so that an ordinary player could finish, the lock I was proudest of was a museum piece nobody tripped. A real lock that never triggers feels exactly like no lock at all. So my note wasn't 'the mechanic is broken' — the mechanic was the best thing I made. It was *calibration:* the engine gives you these powerful gates, but tuning them so they actually bite at the right moment, for the right player, is delicate, and right now it's all on the designer's intuition with no feedback. I wanted the tools to *show me* when a gate is unreachable or never-triggered, the way a good instrument shows you you're out of tune."

### Eleanor Frost · Writer

> "I wrote an ending I'm still proud of — the one where you do everything by the book, file the accident report in perfectly good faith, go home, and *never find out* how close you stood to a murder. No drama. Just a quiet man finishing his paperwork. To me that's the most sophisticated thing this engine can do: hold the difference between *what the player knows* and *what is actually true,* and let a story end in the gap between them.
>
> But writing toward that taught me how easy it was to make the prose claim things the state couldn't back. I wanted certain endings to *mean* certain things, and the engine would happily let me write an ending that asserted an outcome the player's variables didn't support. The discipline of 'the words may only say what the flags can prove' isn't a constraint on good writing — it's what *makes* the knowledge-versus-truth game honest. I asked for the engine, and eventually a review pass, to hold me to it. A story about not-knowing falls apart the instant the narration knows something the world doesn't."

### Marcus Lee · Playtester

> "I'm the kind of playtester who goes looking for the seams, and I found a bad one. I played a clean, in-character run — nothing weird, nothing adversarial, just a reasonable person making reasonable choices — and at the resolution point the game checked my state against its list of endings and *matched none of them.* I fell straight through the floor. There was no ending written for the way I'd played. It just stopped.
>
> That's not an edge case you can wave off; that's a structural hole. The endings were a cascade of conditions with a gap in the middle, and a perfectly normal playthrough found the gap. The fix is non-negotiable and it's simple to state: *there must always be a catch-all.* Every possible end-state has to land on exactly one ending — no holes a player can fall through, and no dead-code endings that nothing can reach. Make the engine *guarantee* exhaustiveness, so 'the game has no ending for what I just did' becomes literally impossible to build."

---

## Team 3 — *The Prater Line*

### Sasha Brandt · Designer

> "Trust was my whole currency. The thing I'm proudest of is the two films — a worthless decoy the defector will hand anyone, and the real microfilm she keeps against her body until she believes you. That makes a relationship *mechanically load-bearing* in a way the player can see and reason about. When it works, it's the cleanest expression of the whole engine I managed.
>
> Where I tripped was subtler, and I think it's the most dangerous trap of all because it doesn't look like a bug. I had one number — the KGB man's suspicion — and over the course of building, I quietly let it mean three different things: how much *Cal* distrusts everyone, how willing *Volkov* is to cut a deal, and how much heat the enemy net is putting on. Three contradictory meanings, one variable. By the end, the same number was pulling the story in three directions, and the endings it drove felt like a coin flip — not because the player did anything wrong, but because the variable itself was incoherent. My recommendation was almost embarrassingly basic: *one variable, one meaning.* Make the tooling flag it when a number is being asked to mean more than one thing. It's the cheapest possible discipline and it would have saved my third act."

### Anton Weiss · Writer

> "I wanted the night to feel like le Carré — rain, smoke, the slow tightening of a noose. And a noose needs a clock. So I wrote the time into the scenes the way a novelist does: the canal at eighteen minutes past eleven, Volkov in the underpass at twenty past midnight, the platform at one-forty. Authoritative, specific, dread-soaked. I needed the prose to *feel* like 2:10 was bearing down.
>
> Meanwhile the engine, on the same path, thought it was barely nine o'clock. I had written a beautiful, urgent, *fictional* timeline laid over a real one that hadn't moved. Two clocks, openly disagreeing, and the reader caught in between. I knew it was incoherent as I was typing it — but the alternative was prose with no urgency at all, and I wasn't willing to write that. That's the trap, exactly: the engine put me in a position where the *honest* choice (trust the real clock) produced a limp scene, and the *dishonest* choice (invent the time) produced a great one. The only real fix is to take the choice away from me — one clock, the engine's, surfaced into the prose by a token. Give me a real deadline to write against and I'll never need to fake one."

### Nadia Ostrowski · Playtester

> "The double-cross path is the best thing any of the three teams made — I'll say that plainly. Searching the satchel, learning the woman was sold out before the night even started, and then watching that knowledge *recolor* every later scene — the coffeehouse reads differently, the canal proves the doubling, your own handler becomes the enemy. When the satchel discovery lit up the whole chapter, that's the engine's promise delivered. That's a living world.
>
> But it was *fragile,* and fragility is its own kind of broken. The whole brilliant path only assembles if you happen to ride the Ferris wheel first, for one extra point of suspicion, *before* you witness the handoff. Skip the wheel — a totally reasonable thing to do — and you arrive at the payoff one point short, the deal you've been earned the right to make is silently locked, and you feel *cheated,* like the game moved the goalposts. And the failure ending I was supposed to be able to reach was nearly unreachable, because its gate fought its own requirements. So my note was two-sided: the reactive spine is *real and worth everything* — and it needs the tools to show the author where a path is one point from impossible, or where a 'fail' state can never actually fire. The magic is here. It's just standing on a ledge."

---

## The Showrunner

### Imani Cross · Showrunner

> "I read three reports from three teams who had never spoken to each other, never seen each other's games, never compared a single note. A hurricane on the Gulf coast, a murder on a cold island, a defection in Cold War Vienna — about as far apart as three stories can be. And the reports said *the same four things.* The clock doesn't bite. The writers faked the time to hide it. The 'world moves without you' event isn't real. The endings are wired to choices instead of earned from state. Word for word, in effect, three times.
>
> When three people who've never met independently describe the same crack in the same wall, you stop blaming the people and you start looking at the wall. That was the whole insight. These weren't three teams making three mistakes. This was one design quietly steering three skilled teams into the same four ditches — because the design left those four things to discipline, and discipline doesn't scale. The proof was sitting right there in the one thing that *worked* everywhere: the clue-gating. Every team nailed it, every playtester called it the moment the world came alive — and it was the *only* feature the engine *forced* them to wire correctly. The lesson wrote itself. The four things that broke were the four things we'd made optional. Make them structural and they'll work as reliably as the clue-gating did.
>
> So the verdict wasn't 'no.' The prose was genuinely good, the scope was right, and when the reactivity worked it was *exactly* the living world we'd promised. The verdict was *go — with changes,* and the changes weren't to the stories. They were to the engine. My one strong recommendation was the counterintuitive one: *don't fix these three chapters.* Harden the engine so these failures become impossible, then take the strongest of the three — *The Prater Line* — and run it through the fixed engine to prove it. Build a foundation that can't be built wrong, and everything you put on top of it becomes trustworthy. I'm told that's exactly what happened next. From where I sat, that's the moment the project grew up."

---

*Three teams, three genres, one wall — and ten people who, between them, told us precisely how to take it down. Everything in the next section is the engineering answer to what they found.*

---

# You Said → We Built

The most important thing about that experiment isn't what the teams found. It's what we *did* with it. Every recommendation in the interlude above became a concrete change to the engine — not a backlog item, not a "we'll consider it someday," but a structural rule or an automated check that is running in the code today. Here's the loop closed, recommendation by recommendation:

| The team asked for… | Who said it | What we built | Status |
|---|---|---|---|
| "Compute the longest path; refuse to ship a clock that can't run out." | Mara (T1 designer) | A build-blocking check that computes the longest reachable playthrough and **fails the build** if the deadline can't expire. | ✅ Built |
| "Take the clock away from me — give me a token that prints the *real* time." | Tom (T1 writer), Anton (T3 writer) | Time is now derived by the engine from one source of truth; hardcoded timestamps are *banned*; prose uses a `{{time}}` token the engine fills with the live clock. One clock, the real one. | ✅ Built |
| "No scene or ending may claim something unless the flag is set on the path that got you there." | Dani (T1 playtester), Eleanor (T2 writer) | A normative rule that prose can't contradict state, plus a prose-versus-state audit that maps every claim to a guaranteed flag — which **caught real lies** hiding in our own reference chapter. | ✅ Built and exercised |
| "There must always be a catch-all — every end-state lands on exactly one ending." | Marcus (T2 playtester) | Endings replaced with a single state resolver plus a **mandatory default**; a check guarantees exhaustiveness — no holes to fall through, no dead-code endings. | ✅ Built |
| "Make the missed-event recovery real and reachable." | All three teams | Scheduled events are now real engine triggers with a *required,* reachable recovery path; the linter rejects any event that doesn't have one. | ✅ Built |
| "Show me where a gate is unreachable or a path is one point from impossible." | Priya (T2 designer), Nadia (T3 playtester) | The linter flags unreachable scenes and dead-code endings, and the new flow graph draws every lint problem **right on the map**. The deeper "this gate never fires / you're one point short" analysis is roadmapped for the AI-assist layer. | ◐ Partial — structural checks built; calibration analysis planned |
| "One variable, one meaning — flag a number being asked to mean three contradictory things." | Sasha (T3 designer) | The design now requires every variable to declare a single purpose; the automatic *overloading detector* is specified as a guardrail but not yet built. | ◐ Specified — detector planned |
| "Harden the engine *first* — make the four optional things structural — *then* prove it on the strongest chapter." | Imani (showrunner) | The entire strategy of the last few days: rebuild the engine around enforcement, then port *The Prater Line* onto it as the proof. | ✅ Done |

Look at that right-hand column. The overwhelming majority is **built and running.** A couple are honestly marked **partial** or **planned.** Nothing is hand-waved. That's the discipline we're proudest of — not that we *collected* feedback, but that we turned almost all of it into code that *enforces itself,* and that we're square with you about the handful that's still ahead.

Everything below is the engineering story behind that table.

---

# Part IV — Rewriting the Rules

## One principle to organize everything

We took everything the triple-team review taught us and distilled it into a single organizing principle that now governs the entire engine:

> **The engine enforces its own promises; the author cannot silently break them. Anything we left to author discipline becomes an engine primitive plus a build-blocking check.**

Read that twice, because it's the whole strategy. Every promise the engine makes to the player — "the clock matters," "the world moves without you," "your ending is earned" — has to be something the *engine guarantees*, not something the *writer remembers to do.* If a writer tries to build a story that breaks one of those promises, the system should catch it and refuse to let it ship, exactly the way modern software won't compile if you make certain classes of mistake.

We wrote this up as **version 1.1 of our product requirements** — the formal revision of our design document — built around four corrections and one new safety mechanism.

## The four corrections, in plain language

**Correction 1 — Time is now the engine's job, and faking it is banned.** The clock has exactly one source of truth: the starting time plus the real minutes that real actions cost. The engine computes the current time and hands it to the prose. Writers are *forbidden* from typing a hardcoded time into a scene; if they want to reference the time, they drop in a `{{time}}` token that the engine fills in with the *real* current time. There can no longer be two disagreeing clocks, because there's only one clock and the writer can't overrule it.

**Correction 2 — Scheduled events are now real, with a guaranteed "you missed it" path.** A timed event (like the 11:30 canal handoff) is now a genuine engine trigger. After every action that advances time, the engine checks every pending event. When one fires: if you're present, you witness it; if you're absent, the engine *automatically* applies the world-state change and *automatically* plants a discoverable clue at a reachable location, so missing it opens a different path instead of dead-ending. And — this is the enforced part — every scheduled event is *required* to have that reachable recovery path. You literally cannot build an event without one.

**Correction 3 — Endings are now resolved from state, with no holes.** We replaced all the hand-wired "this choice leads to this ending" links with a single **Ending Resolver.** At the end, it walks an ordered list of possible endings, each gated by conditions on your accumulated state, and picks the first one that matches. There is a *mandatory* catch-all default ending, which guarantees that **every possible end-state lands on exactly one ending** — no more "a clean playthrough that matches no ending and falls through the floor," and no more "a failed run that accidentally gets the hero ending." Choices can change your state and your time, but they are *forbidden* from pointing directly at an ending.

**Correction 4 — The prose cannot contradict the state.** No scene — and especially no ending — is allowed to narrate something ("the town drowned," "she was caught") unless the corresponding flag is *actually set* on the path that got you there. This one is partly enforced by the engine (it guarantees the *state* an ending sees is real) and partly by a review checklist — and, as you'll see, our automated review process caught real violations of exactly this rule.

## The linter: the linchpin

The single most important new piece is something we call the **linter** — and it's the mechanism that turns "the playtester noticed it" into "you cannot ship it broken."

If you've used a word processor, you've used a spell-checker: it underlines your typos in red and won't let certain mistakes slip by unnoticed. A code "linter" is the same idea for software — an automated checker that scans the work and flags problems. Our story linter does this for *narrative structure*, and it runs both while the writer works and as a build gate that **blocks broken stories from shipping.** It enforces three new, non-negotiable checks that map directly onto the failures the teams hit:

1. **Can the clock actually run out?** The linter computes the longest possible path through the story and *fails the build* if that path can't exhaust the deadline. If you built a six-hour story where the longest possible playthrough only takes two hours, the linter stops you. The clock is the spine of every premise, and it is now mathematically impossible to ship one that doesn't bite.

2. **Do the endings cover every case, with no dead code?** It verifies that every reachable end-state lands on exactly one ending — no zero-match holes (a playthrough that matches nothing) and no dead-code endings (an ending that's impossible to reach).

3. **Does every scheduled event have a reachable recovery path?** It confirms that every timed event defines both its present *and* absent outcomes, and that the absent-path clue lives somewhere the player can actually get to.

On top of those, it carries forward the ordinary structural checks — broken links between scenes, undefined variables, dead-end scenes with no exit, duplicate IDs, and so on. The effect is profound: **the four failures that caught three skilled teams are now things the system simply won't let you do.**

## The architectural bet: one engine core

Underneath all of this sits the decision we flagged earlier as crucial:

> The engine — the state, the conditions, the effects, the clock, the scheduled events, the ending resolver, the linter — is a **single, pure, self-contained module** consumed *identically* by the player, by the authoring tool, and by the automated checks.

This is the structural reason the whole thing holds together. Because there's exactly one engine, the player and the authoring tool can never drift apart — what the writer previews is, byte for byte, what the player will experience. The linter and (eventually) the AI assistant can reason about *exactly* what the player will see, because they're looking at the same engine. And the engine itself can be tested in complete isolation, which is why we have so much confidence in it. It's the answer to the review's root-cause finding: don't trust discipline; build a foundation that can't be built wrong, and share it everywhere.

Finally, we **consolidated** all of this. The v1.1 corrections didn't stay as a separate "addendum" floating alongside the old document — we rolled them directly into the main requirements document so there's a single, authoritative source of truth, with the full rationale preserved as an appendix. (A small thing, but it matters: a spec that quietly contradicts itself is its own kind of bug.)

---

# Part V — Building the Engine (Sub-project A)

With the rules rewritten, we decomposed the work into a sequence of focused **sub-projects**, each with its own design, plan, build, and review cycle. We made a deliberate rule: **start with the engine, and do not author any more stories until the engine can enforce its own rules.** No point pouring more prose into a foundation that still lets you build it wrong.

## What we built

**Sub-project A** is the hardened engine core and linter — the headless heart of everything. "Headless" means it has no screen, no buttons, no graphics; it's pure logic. Give it a story and a player's choices, and it tells you what happens: it tracks the clock, evaluates which choices are available, applies their effects, fires scheduled events, resolves endings, and lints the whole thing for structural problems.

It's deliberately built as a set of small, single-purpose pieces — a time module, a state module, a conditions evaluator, an effects processor, an ending resolver, a scheduled-events handler, the main game loop, and the linter — composed behind one clean public interface. Roughly ten focused modules, each doing one job well.

## How we built it (and why that matters)

This is where the "how we work" story becomes part of the "what we built" story, so it's worth being concrete.

We didn't just start typing. For each sub-project, we ran a disciplined pipeline:

1. **Brainstorm and design** — work through the intent and the trade-offs and lock a written design before any code.
2. **Write a detailed plan** — break the design into bite-sized, *test-first* tasks, each with the exact code to write and the exact tests to prove it.
3. **Build it task by task** — using **test-driven development**, which means: write the test that describes the desired behavior *first*, watch it fail, then write the minimal code to make it pass. Every single feature is born with a test that proves it works.
4. **Review every task with a fresh, independent agent** — checking two things separately: did it build *exactly* what was asked (no more, no less)? And is it built *well*?

The engine came together this way: condition evaluation, effects, the engine-derived clock, the scheduled-event present/absent firing, the ending resolver's exhaustiveness, and the three linter checks — each one written test-first, each one proven green before moving on.

## The proof point for the engine

The bar we set for "the engine is done" was specific and demanding:

> The linter must **block a deliberately-broken chapter** and **pass a correct one.**

It does. We fed it stories with broken links, missing default endings, undefined variables, dead-end scenes, unreachable event-recovery nodes, and clocks that can't bite — and it caught every one. We fed it a clean story, and it passed. The engine ships with around **45 automated tests** covering exactly these behaviors, and they're green.

There's a small moment from this phase that captures the whole philosophy. While building the engine's first end-to-end test story, our own sample story accidentally placed a recovery clue at a location the player could never reach — a dead end, the exact failure the review existed to prevent. The linter caught it immediately. We didn't weaken the check to make our test pass; we fixed the story, because the linter was *right.* That's the engine doing its job on its own creators. That's the whole point.

---

# Part VI — Making It Playable (Sub-project B)

An engine with no face is hard to fall in love with. **Sub-project B** is the mobile-responsive web player — the thin, clean interface that sits on top of the engine and lets a human actually play.

It's built with standard modern web tools, deliberately as a *thin* layer: the player view never re-implements any game logic. It asks the engine what to show and renders it. (Remember the one-engine-core principle — the player is just a face on the shared brain.)

What it gives you:

- **A clean reading experience.** A single-column, mobile-first layout — readable on a phone — that shows the current scene, the time and your location at a glance, and your available choices as big tappable buttons.
- **Hidden choices stay hidden.** Choices you can't yet take (because you don't have the right knowledge or relationship) simply don't appear in the player view. It stays immersive — no greyed-out "you can't do this yet" clutter.
- **Named save slots.** You can save your progress into named slots and come back later, all stored locally in your browser.
- **A debug panel for builders.** A toggleable, behind-the-scenes view — meant for the author, not the player — that shows the full game state, the events that have fired and those still upcoming, the *hidden* choices and exactly *why* each one is hidden, which ending the resolver would pick right now, and a live linter status. This is the "why is the story doing this?" window that makes a reactive story actually debuggable.
- **Jump and replay tools.** Reset to the start, or jump straight to any scene to test it.

We built this test-first as well, and it grew the suite to around **67 tests.** And then we put it on the internet. **It's live, right now, at a public URL** — anyone with the link can play it in a browser, on a phone, no install required. (Links are at the end of this document.)

---

# Part VII — The Proof (Sub-project C)

This is the sub-project that mattered most, because it's where the thesis either survives or dies.

## Porting a real chapter onto the hardened engine

The review's recommendation was explicit: don't fix the broken chapters; harden the engine, then **re-run one chapter through it as the reference implementation.** It even named the chapter — Team 3's *The Prater Line* — as the best candidate: the tightest, with the strongest reactive spine and the cleanest twist.

So **Sub-project C** was a *full, faithful port* of The Prater Line onto the new, hardened engine. We took the team's actual Le Carré-register prose and the chapter's complete structure — seven locations, three trust variables (your handler, the defector, the KGB man), the timed canal handoff, the whole web of knowledge gates — and rebuilt it as a story the new engine could run, while *fixing* the six concrete bugs the playtest had found.

This meant doing, for real, all four corrections at once:

- **Recalibrating the clock** so it genuinely bites. We tuned every action's time cost so that an efficient, decisive run reaches the train with a small margin, one major detour is affordable, but stacking two detours — or genuine dawdling — *misses the 2:10.* The linter confirmed the math: the longest path now overruns the deadline (the clock *can* run out), while a viable path still makes it (the chapter is still winnable). "Bites, but fair."
- **Making time engine-derived** — every hardcoded timestamp in the prose replaced with the live `{{time}}` token or relative phrasing. The two-clocks incoherence is gone.
- **Wiring the canal handoff as a real scheduled event** that fires at 11:30 whether you're present or absent, with a genuinely reachable recovery path (the chalk marks and the empty bollard you can read afterward).
- **Replacing the choice-wired endings with the state resolver** plus a mandatory catch-all — so the failed, distrusted, decoy-carrying run can no longer leak into the triumphant ending.

## What it feels like to play

The chapter has the spine that made the playtesters lean forward. Early on, your handler warns you off the canal in a way that's clearly hiding something:

> *"She'll be skittish. She's a physicist, not an agent — she's never done this. So be gentle and be quick, and do not, whatever happens, take her down to the canal. There's nothing for you at the canal tonight."*

When you finally meet Dragomir, she's already decided you might be the wrong person to trust:

> *"You're late," she says, not looking up. "Or you're not him at all. I have been deciding which would be worse."*

And the load-bearing mechanic — the one that makes trust *mean* something — is the two films. A worthless decoy she'll give to anyone, and the real microfilm she keeps against her body:

> *"There is a film. Two films, in truth. One I will give to anyone who asks loudly enough — it is engine schematics, real, worthless. The other..." Her thumb brushes the seam of her coat. "The other does not leave my body until I believe the body it goes to will get on that train with me."*

Whether you ever earn the real film depends on the trust you've built — which depends on the choices you made, the honesty you showed, and what you discovered along the way. It is *not* a button labeled "get the real film." It's an outcome of your accumulated state. That's the whole thesis in one beat.

And then the twist, if you make it to the canal in time to witness the handoff:

> *You expect a Russian. You expect Volkov's square shoulders. It is neither. The receiver steps into the lamplight to take the film, and you know the face — you saw it this evening, in the safehouse stairwell, carrying a message up to Lindqvist. It is Lindqvist's own runner. The film is not going to the enemy. It is going home, around you, around Dragomir, the woman erased from her own defection so the prize can travel light.*

That twist *only lands* because you witnessed a timed world event — or because you missed it and reconstructed it from the clue it left behind. It is the single best argument for why scheduled events are worth building correctly. And now they are.

## Proving it — and the review catching a real lie

Here's where our process earned its keep in a way that genuinely impressed us.

The validation isn't a vibe; it's *automated.* The chapter ships with a battery of tests that play it like a robot and assert the truth at every turn: that all five endings are reachable from the right states, that the canal event fires correctly both when you're present and when you're absent, that the recovery clue is real and findable, and — critically — that a dawdling run actually misses the train while an efficient run makes it. The clock biting is now a *tested fact.*

But the subtler promise — *Correction 4, the prose must never contradict the state* — is the one the engine can't fully enforce on its own, because the engine can't read the meaning of prose. So we ran a dedicated **prose-versus-state audit**, mapping every claim each ending makes against the flags that are actually guaranteed to be set on the path that reaches it.

And the automated review **found real lies.** In the chapter's "failure" ending — the one where the defection collapses — the prose said you board the train *alone* and *with the decoy in your coat.* But the underlying state didn't guarantee either: on some paths that reach that ending, the defector is actually still with you, and on others you never received the decoy at all. The prose was asserting things the bookkeeping contradicted — the *exact* failure mode the whole sub-project exists to eliminate, hiding in our own reference chapter.

We caught it (it took a couple of passes, because the lie was woven through the prose in three different places), and we fixed it the right way: not by faking the state, but by rewriting the prose so every claim it makes is *true on every path that can reach it.* The audit now shows a clean sweep, backed by the tests that prove the state is real.

That's what "the engine enforces its promises" looks like in practice. The story can no longer tell you something the world didn't actually do.

## The verdict on the thesis

The original review said it best: *"If the clock bites and the endings resolve from state in that one chapter, you have proven the living-world thesis and can scale authoring with confidence."*

The clock bites. The endings resolve from state. The event fires whether you're there or not. The prose no longer lies. **You can play The Prater Line on the hardened engine right now, and feel the reactivity on the time and event axes — not just the clue axis.**

The thesis is proven.

---

# Part VIII — Seeing the Whole Story (Sub-project D2)

The triple-team review made one more sharp structural point that we haven't addressed yet. It wasn't about the player — it was about the *author.* The reviewers were blunt: a story this reactive is **genuinely hard to author by hand.** When everything can branch on everything, a writer staring at a wall of scenes and conditions quickly loses the thread. The review's recommendation was to promote the authoring tools from a "later, nice-to-have" item to a *core deliverable.*

The headline of that authoring suite is a **visual flow graph** — and that's **Sub-project D2**, the most recent thing we built.

## What it is

It's a bird's-eye, interactive map of an entire story. Load any chapter and you see the whole thing laid out automatically: every scene as a box, every choice as an arrow, the conditions on each gated choice labeled right on the arrow, the scheduled event shown as a badge wired to its outcomes, and all the endings fanning out from a central "resolver" hub that visually teaches the new rule — *endings emerge from state, they aren't linked to choices.*

Layered on top of all that is the **live linter overlay.** Every structural problem the linter finds is highlighted *on the graph itself* — an unreachable scene rings red, a warning rings amber, and a story-level problem (like a clock that can't bite) shows in a banner. There's a timeline strip across the top showing the deadline window with the timed events marked at their trigger moments. You can see, at a single glance, the shape of the story *and* everything wrong with it.

## What you can do with it

- **Pan, zoom, and fit** the whole story on screen.
- **Click any scene** to open an inspector panel showing its full content, its choices with their conditions and effects, and exactly what it "leads to" and is "reached by."
- **Play from here.** Click a scene and jump straight into the live player *starting at that exact beat* — so you can test a specific moment without replaying from the top.
- **Flip between Play and Graph** views of the same story instantly, both running on the same engine.

This is the read-only first version — you can *see and understand and test* a story this way, but not yet *edit* it through the graph. (Editing is the next piece; more on that below.) But even read-only, it directly answers the review's concern: a state-driven story is no longer an unmanageable wall of text. It's a map you can read.

It ships with around **105 automated tests** total across the whole project, and — like the player — **it's live.** You can open the player, flip to the Graph view, pick The Prater Line, and see the entire Cold War Vienna night laid out in front of you, lint and all.

---

# Part IX — How We Work: Fast *and* Rigorous

We chose to showcase our development method openly in this briefing, because it's genuinely part of why we were able to do this much, this fast, without it being held together with tape. It's worth understanding, because it's a real competitive advantage.

## Agent teams for the hard creative questions

The triple-team review you read about in Part II wasn't a one-off. It's a repeatable capability: we can spin up multiple independent AI teams — designers, writers, playtesters — to stress-test a creative or design question *adversarially and in parallel.* That's how we discovered the four structural failures before writing a single line of engine code. Catching a foundational design flaw in a one-day experiment, instead of after months of building on top of it, is the difference between a small course-correction and a catastrophe. That experiment may have been the highest-leverage day of the whole project.

## A disciplined pipeline for the engineering

For the actual building, we used a structured, multi-agent engineering pipeline. Every sub-project went through: *brainstorm the design → write a detailed test-first plan → build it task by task → review every task with a fresh, independent agent → run a final whole-project review.* It's an assembly line with quality gates, where each stage hands off to the next as clean, written artifacts.

The reviews are the part worth dwelling on. After each piece of work, a *separate* agent — one that didn't write the code and has no ego invested in it — checks two things independently: **did it build exactly what was specified** (not more, not less), and **is it built well.** Findings get fixed, then re-checked. At the very end, a final review reads the entire body of work as a whole.

## The receipts: it catches real problems

This isn't review theater. Over the last few days, this process caught and fixed genuine issues that would otherwise have shipped:

- The **prose-versus-state lies** in the validation chapter's failure ending — the exact immersion-breaking bug the whole engine exists to prevent — hiding in our own reference story. It took two review passes to root them all out.
- A **dead-end recovery clue** in an early test story (the linter caught this one automatically).
- Several **planning bugs** of our own making — a reference to the wrong scene, a filename collision that only shows up on certain operating systems — caught at build time and corrected on the spot.
- A **latent type-checking break** that slipped past one stage and got caught at the next.
- A handful of **weak tests** — tests that looked like they were checking something but could actually pass even if the feature were broken — that the reviews flagged and we strengthened so they'd genuinely catch a regression.
- A real **usability dead-end** in the final review: after using "play from here," there was no way back to playing from the story's true start. One-line fix, plus a new test to lock the behavior in place.

Every one of those is a bug a customer would otherwise have eventually found. We found them first, in days, with an automated process. That's the "rigorous, not tape" story, and it's true.

And the whole thing is anchored by **test-driven development** end to end. Around **105 automated tests** stand guard over the engine, the player, the validation chapter, and the graph. When we change something, the tests tell us immediately if we broke something else. That's not a nice-to-have; it's the safety net that lets us move quickly *without* moving recklessly.

---

# Interlude — In Their Own Words: The Build

The first interlude was the voices of the people who *found* the problem. This one belongs to the people who *built the answer* — the engineers who turned four corrections into running code, and the reviewers whose entire job was to try to prove that code wrong. Same honest framing as before: these were our engineering and review agents, voiced from their work. We include them because, on a project like this, *how* you build is as much a part of the story as what you build.

## Building the foundation

### Yuki Tanaka · Engine Engineer (Sub-project A)

> "Most of my job was resisting the urge to make the engine *clever.* The whole bet is that the core is small, pure, and boring — it takes a story and a choice and tells you what happens, and it has no idea whether there's a screen attached or a writer watching or a robot running a thousand playthroughs. That boringness is the feature. It's why the same engine can run the game, check the story, and draw the graph without three different versions drifting apart.
>
> The piece I'll remember is the linter — the part that *refuses* to let a broken story through. I built it test-first, which means before I wrote the check for 'can this clock ever run out,' I wrote the failing test that proved a too-cheap clock *should* be rejected, watched it fail, then made it pass. And then the linter did the thing I'll never get tired of: it caught *us.* The first little story I built to exercise the engine accidentally hid a recovery clue in a place the player could never reach — a dead end, the exact sin the whole review was about. The linter flagged it instantly. The temptation, always, is to soften the check so your own work passes. We did the opposite — we fixed the story, because the linter was right. The day the safety net catches its own builders is the day you know it'll catch everyone."

### Diego Marín · Player & Graph Engineer (Sub-projects B & D2)

> "I wrote a player that doesn't *decide* anything. That sounds like an insult; it's the highest compliment I can pay this architecture. Every other branching engine I've seen ends up with logic smeared across the interface — the screen quietly making its own little judgments about what to show. Ours can't. The player asks the one engine 'what's the scene, what choices are live, what time is it?' and draws the answer. Nothing more. That's why I could put it on the web in an afternoon and trust that what you play on your phone is *byte-for-byte* what the writer previewed.
>
> The graph was the most fun thing I've built in a while. The reviewers had said a state-driven story is unmanageable to author by hand, and they were right — until you can *see* it. Watching The Prater Line lay itself out automatically, the whole Vienna night as a map, with the timed canal event wired to its present-and-absent outcomes and the endings fanning out from that little resolver hub — that hub is my favorite detail, because it's not decoration, it's *teaching.* It shows you, at a glance, that endings emerge from state instead of being hooked to buttons. And then you click any scene and hit 'play from here' and you're *in* it. The abstract logic and the lived experience, one click apart. That's the moment the tool stops being a diagram and starts being a workshop."

### Rosa Calderón · Chapter Porter (Sub-project C)

> "Porting The Prater Line was where the whole thesis got put on trial, and the trial was the clock. The original had this gorgeous six-hour night that, mechanically, you could amble through with hours to spare. My job was to make every minute *cost.* I sat with the map and tuned it like an instrument: a tram ride, a walk across a district, a long fraught conversation — until an efficient, decisive run reaches the 2:10 train with just enough margin to feel earned, one big detour is affordable, and stacking two of them, or genuinely dithering, *strands you on an empty platform in the rain.* 'Bites, but fair.' And I didn't get to declare victory by feel — the linter checked my arithmetic, and the tests *played the chapter like a robot* and proved it: here is a dawdling run that misses the train, here is an efficient run that makes it. The first time that 'dawdling misses' test went green, the abstract promise — *the clock bites* — became a fact I could point at.
>
> The other quiet satisfaction was deleting every fake timestamp from the prose and replacing it with the live token. The writer's original night was beautiful and it lied about the time on every other page. Now there's exactly one clock — the engine's — and the prose can only ever tell you the truth about it. The story got *more* honest, and it lost nothing."

## Trying to break it

### Aisha Bello · Code Reviewer

> "My job is to assume the report in front of me is wrong. Not malicious — just optimistic, the way everyone is about their own work. So I don't take 'all tests pass, looks clean' at face value; I read the actual change and try to find where it lies.
>
> The one I'm proud of is the burned ending in The Prater Line — the failure ending, where the defection collapses. The prose said, beautifully, that you board the train *alone,* with the worthless *decoy* heavy in your coat. Lovely writing. Completely unbacked. On the paths that actually reach that ending, the defector can *still be with you,* and on some of them you never received the decoy at all. The narration was asserting two specific facts the game's own state didn't guarantee — which is the *exact* immersion-breaking failure this entire engine was built to make impossible, and there it was, hiding inside our own showcase chapter. It was sneaky, too: the lie was woven through three different places, so the first fix missed one and I had to send it back. We didn't fix it by faking the state to match the prose — we rewrote the prose so every word is true on *every* path that can reach it. That's the bug worth catching: the one the whole system exists to prevent, caught in the system's own flagship. If we can find it in our best work, we can find it anywhere."

### Sam Whitlock · The Orchestrator

> "People assume 'fast' and 'rigorous' are a trade-off, and on this project they were the same thing, because the rigor was *automated.* Every piece of work went through the same assembly line: design it, write a test-first plan, build it task by task, and then hand it to a *fresh* reviewer who didn't write it and has no pride in it. Two questions, every time — did it build exactly what we asked, and is it built well — answered by someone whose only job is to be unimpressed.
>
> And it earned its place over and over. It caught the prose lies Aisha described. It caught a recovery clue stranded at a dead end. It caught my *own* planning mistakes — a reference to the wrong scene, a filename collision that only shows up on certain machines — at build time, before they could rot. It caught a type error that slipped one gate and got nabbed at the next. It even caught a *weak test* — one that looked like it was checking something but would have passed even if the feature were broken — and made us strengthen it. None of those would have been catastrophic alone. All of them, shipped together, are how a promising demo quietly becomes an unreliable product. We found them in days, with a process, instead of in months, with customers. That's not a slogan. That's the receipts."

---

*The story so far has been about doubt being answered. The voices above are why we trust the answers. The next section is the plain accounting of where that leaves us.*

---

# Part X — Where We Are Right Now

Let's be concrete and honest about the current state.

## The numbers

In roughly **two days** of focused development, we produced **49 commits** (37 of them feature, test, and fix work), around **105 automated tests** (all green), a headless engine of about **10 focused modules**, a polished mobile web player, a fully ported and validated reference chapter, and a visual flow-graph authoring view — and we deployed two of these publicly.

## What's playable today

This is the part to internalize: **this is not a slide deck. It's running software you can touch.**

- You can open a web browser — on a computer or a phone — and **play two complete stories** end to end: a small demo, and the full Cold War Vienna chapter, *The Prater Line.*
- In The Prater Line, the **clock genuinely constrains you.** Dawdle, and you'll watch the 2:10 train pull away while you're still in the rain.
- The **canal handoff fires on its own schedule** — witness it for the twist, or miss it and recover the truth from the clue it leaves behind.
- The **ending you reach is earned** from the trust you built, the film you're carrying, what you witnessed, and how much time you had left. No two of those endings is hand-wired to a button.
- You can flip to the **Graph view** and see the entire story as a map, with the linter's findings drawn right on it.

In short: the parts of the original vision that everyone — including us — was least sure could actually be made to *feel alive* are the parts you can now experience directly.

## The honest scorecard

The original product breaks down into four big pieces. Here's where each stands:

| Piece | What it is | Status |
|---|---|---|
| **A — Engine + Linter** | The headless brain; enforces all the rules | ✅ **Done** — built, tested, the linter blocks broken stories and passes good ones |
| **B — Web Player** | The mobile reading/playing experience + debug panel | ✅ **Done** — built, tested, **live on the web** |
| **C — Validation Chapter** | A real chapter ported onto the hardened engine to prove the thesis | ✅ **Done** — *The Prater Line* plays correctly; thesis proven |
| **D — Authoring Suite** | The tools writers use to build stories | ◐ **Started** — the visual flow graph (**D2**) is done and live; the editor, deep inspector, and AI-assist remain |

Put simply: **three of the four pillars are complete, and the fourth is underway.** The riskiest pillars — the engine and the proof that the concept works — are the ones that are done.

---

# Part XI — What Remains: The Road to a Finished Product

It would be a disservice to leave you with the impression that this is finished. It is not. What's *proven* is the engine and the concept. What's *not yet built* is most of the authoring experience — and there are real hurdles between here and a polished product. Here's the honest map.

## The next three pieces of the authoring suite

The authoring suite (Sub-project D) is really four pieces. We've built the first. Three remain, and they build naturally on top of the proven core.

**D1 — The Story Editor (the big unlock).** This is the most important thing left to build, because it's the one that changes *who can use BranchWorld.* Today, authoring a story means writing structured data by hand — effectively, a programmer's task. The editor replaces that with forms: create and edit scenes, choices, conditions, effects, variables, locations, timed events, and endings through a friendly interface, with the **live linter** flagging problems as you type, and the ability to import and export a story. **Until this exists, a non-technical writer cannot author a BranchWorld story.** This is the bridge from "engine for engineers" to "tool for writers," and it's the next thing we'd build.

**D3 — The Logic Inspector.** A deeper version of the debug panel's "why?" feature, built for serious authoring: select any scene and instantly see when it appears, where it leads, what it changes, and who depends on it — plus a "why did (or didn't) this appear?" trace that walks you through the engine's reasoning. This is what makes a large, complex story *debuggable by a human* instead of bewildering.

**D4 — AI-Assist (the lever for scale).** This is the most ambitious remaining piece and, strategically, the most important for the long game. It's an AI assistant layered over the engine that can: draft or expand scene prose from a scene's structural intent; analyze a story for prose-versus-state contradictions, missing recovery paths, and ending holes; propose clock calibrations that make the deadline bite without making the chapter unwinnable; and suggest knowledge-gated opportunities the author hasn't exploited. The governing principle is *"the AI proposes; the linter verifies"* — the assistant is a creative accelerant, never an unchecked authority, because everything it suggests still has to pass the same engine and linter the human's work does. This piece requires connecting to an AI service, which is new infrastructure, so it's naturally the last of the four.

## The real hurdles

Beyond "there's more to build," there are genuine challenges we want to be clear-eyed about:

**Authoring cost is the real bottleneck — and it's structural.** Here's the uncomfortable truth the review surfaced, and it hasn't gone away: *the reactivity that makes BranchWorld special is exactly what makes it expensive to author.* A truly reactive scene needs multiple variants for different times and different states — the coffeehouse reads differently at 9 PM than at midnight after the handoff. A 14-scene chapter can be closer to 30–40 written prose blocks once you account for all the variants. This is why each test chapter was rightly scoped at 14–31 scenes: that's roughly the most reactivity a small team can author *well.* Scaling content is the central challenge of the whole product — and it's precisely why the AI-assist layer (D4) matters so much. **D4 is not a bonus feature; it's the lever that makes the economics of authoring work at scale.**

**One chapter is proof of concept, not proof of robustness.** We've proven the engine on a single, carefully-ported chapter. Proving it *holds up* across more chapters, more genres, and more authors — including authors who aren't trying to break it on purpose — is the next layer of validation. The engine is sound; the breadth isn't tested yet.

**Calibrating the clock is still a craft.** The engine now *enforces* that the clock can bite (the linter won't let you ship a story where it can't), but tuning it so it bites *fairly and dramatically* — tense without being punishing — is still a human authoring skill, per chapter. The AI-assist's calibration proposals (D4) are designed to help here, but it remains real work.

**A known design constraint to budget for.** The engine currently combines conditions with "AND" only — it can't natively express "this OR that," which means certain logic has to be split across multiple scenes. This is workable at the scale we're authoring today, but as stories grow it can multiply the scene count. One of the three test teams flagged this independently. It's a real structural limit we'll want to address deliberately rather than discover the hard way at scale.

**Productization, not just engineering.** Finally, there's the long tail of turning a proven engine into a *product*: visual polish and art direction (the current player is clean and functional but intentionally restrained), user accounts and cloud saves, a richer asset pipeline (images, audio), performance tuning, and all the unglamorous work that separates "impressive demo" from "thing customers pay for and rely on."

## The shape of the path

None of these hurdles is a question of *whether* it can be done — they're questions of *how much work* and *in what order.* And critically, **all of it now sits on a proven foundation.** The single biggest risk in this entire project — "what if state-driven branching just doesn't feel alive, or just can't be enforced?" — is *behind us.* The remaining work is the (substantial, but far more predictable) work of building tools and content on top of a core we trust.

That's a fundamentally better place to be standing than we were a few days ago.

---

# Part XII — The Big Picture

Step all the way back, and here's the arc of the last few days:

We started with a **vision** that was easy to fall in love with and easy to doubt: stories that branch on everything you do, that feel like living worlds rather than branching books.

Instead of betting the farm on that vision, we **tested it adversarially** — three independent teams, three excellent games, one brutal honest experiment.

The test handed us the **best gift a test can give**: a precise, structural diagnosis. Not "this is hopeless," but "*these four specific things break, and they break because your design leaves them to chance.*"

We **rewrote the foundation** around a single principle — make the engine enforce its own promises — and built it: a hardened engine, a build-blocking safety net, a playable mobile player, and a fully ported reference chapter that proves, in running code you can play on your phone, that the clock bites, the world moves without you, the endings are earned, and the prose can't lie about it.

And we **gave authors a map** — a visual flow graph that turns an intimidating web of reactive logic into something a human can see and understand at a glance.

Every step of it was built with a fast-but-rigorous method — adversarial AI design teams to find the flaws, a disciplined test-first engineering pipeline with independent automated review to build it right — and the receipts are real: that review process caught genuine bugs, including the very class of immersion-breaking lie the whole engine exists to prevent.

**What this means.** The thing that could have killed this project — the possibility that the core concept simply doesn't deliver the feeling we promised — has been put to rest. It delivers. We can play it. The remaining work is large but it's the *good* kind of large: building the writer's tools and the content pipeline on top of a core we've stress-tested and trust. That's a project with its hardest question already answered.

The three test games made it "click" once before, on paper. Now there's a real one running on a real engine, and the click is louder. We're genuinely excited about where this goes — not because of hype, but because the part everyone was right to be skeptical about is the part that's now undeniably working.

There's a long road to the finished, polished product. But for the first time, it's a road that starts from *proven ground.*

---

# Appendix A — Try It Yourself

This isn't a thought experiment. Open these on a laptop or a phone:

**▶ The Web Player (play it):** **https://branchworld-player.netlify.app**

A two-minute guided tour for the best first impression:

1. When it loads, you'll see a small demo story. Use the **story selector** at the top to switch to **"The Prater Line."**
2. Read the opening, then start making choices. Notice the **time advancing** in the top bar as you act, and your **location** changing as you move across the city.
3. Try to **build trust** with Dragomir at the coffeehouse — be honest with her — and see whether you earn the *real* microfilm versus the decoy.
4. Make your way toward the **Danube Canal before 11:30 PM** to witness the handoff and its twist — or deliberately dawdle elsewhere and watch the world move on without you, then find the clue it leaves behind.
5. Flip the **Play / Graph** toggle (top right) to switch to the **flow graph.** Watch the entire night lay itself out — scenes, choices, the timed event with its present/absent edges, the endings fanning out from the resolver hub, and the linter's findings drawn right on the map. Click any scene to inspect it, then hit **"Play from here"** to jump straight into that moment.

**▶ The Triple-Team Review (the experiment that started it all):** **https://branchworld-review.netlify.app**

This is the interactive report from the three-team test — the headline verdict, the prioritized findings, and the full detail on all three games, including *The Prater Line.* It's where the four structural failures were diagnosed and the path forward was set.

---

# Appendix B — A Plain-Language Glossary

A handful of terms appear in this briefing. Here's what each means, in everyday language:

- **State / world state** — the running ledger of everything that matters in a playthrough: the time, your location, what you know, who trusts you, what you're carrying, what's happened. The story reacts to this whole ledger, not just to your last choice.

- **State-driven branching** — the core idea: the story changes course based on the accumulated state, not only at the moment you tap a choice.

- **Scheduled event** — something that happens in the world at a set time *on its own*, whether or not you're present (like the 11:30 canal handoff). If you miss it, the world still changes, and the engine leaves you a way to recover.

- **The clock / deadline** — the in-game time, which advances as you act. A "biting" clock is one where running out of time is a real, reachable consequence.

- **Ending resolver** — the engine's mechanism for choosing your ending by evaluating your final accumulated state against a list of possible endings, rather than hand-wiring specific choices to specific endings. It guarantees every playthrough lands on exactly one ending.

- **Linter** — an automated checker (like a spell-checker, but for story structure) that flags problems and *blocks a broken story from shipping* — for example, a clock that can never run out, an ending nothing can reach, or a timed event with no recovery path.

- **The engine core** — the single, self-contained "brain" that runs all the game logic. The player, the authoring tool, and the automated checks all use this same brain, which is why they can never disagree about what the game does.

- **Test-driven development (TDD)** — a way of building software where you write the test that defines "working" *before* you write the code, so every feature is proven the moment it exists.

- **Sub-project** — one self-contained chunk of the overall build (the engine, the player, the validation chapter, the authoring tools), each taken through its own design → plan → build → review cycle.

---

*End of briefing. Questions, requests for a deeper dive on any section, or a shorter/longer cut — just ask.*
