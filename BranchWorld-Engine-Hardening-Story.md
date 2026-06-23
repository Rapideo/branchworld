# Hardening the Spine: How a Fresh Team Tried to Break BranchWorld — and What We Fixed Because They Could

*A narrative account of the v1.2 engine-hardening pass — the team that stress-tested the engine, what they found, and the precise changes we made and why.*

---

## Prologue: The Question We Had Never Actually Asked

There is a particular kind of confidence that is dangerous precisely because it is earned.

By the middle of June we had a great deal to be confident about. The BranchWorld engine — the small, pure, framework-agnostic core that decides how a story branches on *world state* rather than on simple A/B/C buttons — had been validated twice. The first time, three independent teams reviewed the original concept and, working in isolation, all walked into the same four structural traps: an inert clock that never bit, prose that hard-coded timestamps the engine didn't agree with, scheduled events that were really just cosmetic set-dressing, and endings that were wired to the choice you clicked rather than the world you'd actually built. Those four traps became the four corrections — the "EE" rules — that the whole hardened engine was rebuilt around. The second validation came when we ported Team 3's Cold-War-Vienna chapter, *The Prater Line*, onto the hardened engine and watched it hold: a ticking deadline that bit but stayed fair, a canal handoff that fired whether you were present or absent and always left a recoverable thread, five endings that resolved from the state of the world and a mandatory catch-all so that no configuration of variables could ever fall through the floor.

Two validations. Both passed. And yet, sitting there with the player deployed and the flow graph humming, I realized we had never actually asked the engine the one question that mattered most before we scaled it.

We had validated the *concept*. We had validated a *port* — a story that was already designed, bent carefully to fit the rules. What we had never done was hand a fresh team the finished engine and say: *build something new, from scratch, and tell me whether the engine fights you. Tell me whether it lies. Tell me whether there is a fifth trap we haven't found yet.*

That is the question this document is about. Because we asked it. And the answer was not the comfortable "you're fine, ship it" that a tired founder half-hopes for. The answer was: *the foundation is sound — and it is held together by your discipline, not by the engine itself.* Which is a very different thing, and a far more useful one.

This is the story of how the team found that out, what specifically they found, and exactly what we changed in response — and, just as importantly, *why* each change was made the way it was.

---

## Reconvening the Team

The cast was the same one that had served us so well through the concept reviews and the build: a standing group I've come to simply call "the team." Imani Cross in the showrunner's chair, holding the whole thing together and refusing — as is her habit — to let anyone deliver a verdict softer than the evidence supported. The nine analysts, arranged as they always are into three lens-teams. Mara Okonkwo-Vance, Tom Réti, and Dani Brooks on time and systems. Priya Sundaram, Eleanor Frost, and Marcus Lee on endings and state resolution. Sasha Brandt, Anton Weiss, and Nadia Ostrowski on integrity and tooling — the people whose job is to ask whether the linter actually enforces what it claims to enforce. Alongside them, the craft trio: Sam Whitlock the playtester, Rosa Calderón the writer, Diego Marín the designer, whose job was not to read the engine's code but to imagine *authoring against it* and report where it would chafe. And on the bench, the engineering voices — Yuki Tanaka and Aisha Bello — ready to turn findings into fixes.

The mandate I gave them was deliberately, almost rudely, blunt. *Do not bless this engine. Try to break it.* I did not want a review that produced a list of nice-to-haves and a gold star. I wanted the team in an adversarial crouch, each lens looking for the precise input — the exact little story, the specific sequence of choices — that would make the engine do something dishonest. The instruction to each group was the same: *write the story this engine cannot tell truthfully. Find trap number five. And if you genuinely cannot break it, that silence is itself the result we're looking for.*

There was a reason for the severity. A review that comes back glowing teaches you nothing; it only flatters the work you already did. The entire value of reconvening the team *before* we authored three new chapters — a mob story, a children's cave adventure, and a bank-heist thriller, each in a wildly different genre — was to find the cracks while they were cheap. A flaw discovered now costs a few days of hardening. The same flaw discovered after we'd poured three chapters of hand-crafted narrative on top of it costs all three chapters, re-authored, plus the loss of trust in everything built since. Running the adversarial review first was not caution for its own sake. It was the single highest-leverage decision available.

So they went to work — not on a slide deck, but on the live engine source, reading the actual reducers and the actual linter and the actual reference chapter, and constructing actual stories designed to expose lies.

---

## The Standard of Proof

Before the findings, one decision shaped everything that followed: *how* the team would validate. And it turned out to be the question that separated a serious review from a theatrical one.

The instinct of most reviews is to *play the game*. Load it in the web player, click around, see if it feels right. But a state-driven branching story does not yield to that approach. The number of distinct reachable states — every combination of clock value, location, clues collected, relationships shifted, flags set — explodes combinatorially. A human playtester, however diligent, sees five or ten paths and pronounces the thing good. That is anecdote dressed as proof. It catches the obvious break and sails serenely past the subtle one that only appears when three particular flags happen to line up in one particular order.

The team committed instead to a layered standard, from most rigorous to most human. First, **adversarial reading of the engine's actual source** — the level at which you catch a soundness flaw, a resolver that picks the wrong ending, an event that can't recover. Second — and this was the upgrade — **exhaustive state-space validation**: rather than *playing* a chapter, walk *every* reachable state mechanically, driving the real engine, and assert the invariants hold across all of them. Not "I tried it and it seemed fine," but "I checked every state the player can possibly reach and exactly one ending resolves from each." Third, and only third, a **human walkthrough in the player** — reserved for the one thing machines genuinely cannot judge: whether the rendered prose, read with human eyes, ever quietly contradicts the state behind it, and whether a branch simply *feels* dead.

The crucial honesty in that ordering is the admission baked into it: the machine can prove the structure, but it cannot read English. That boundary would turn out to be one of the most important findings of the entire review.

---

## What Team 1 Found: The Clock and the Events That Lied

Mara Okonkwo-Vance's team took the part of the engine I was, privately, most proud of: time, and the scheduled events that fire from it. *The Prater Line* runs on a deadline encoded as an absolute number of minutes — `26:10`, two hours and ten minutes past midnight, expressed without wrapping the clock at midnight so the arithmetic stays honest across a long Vienna night. The 23:30 canal handoff fires whether you're standing at the canal or not, applying its consequences in your absence and always leaving a recoverable thread. It is, on paper, the model of what EE-2 promised: events that fire from world-time as real engine constructs, every one of them carrying a mandatory recovery so the player is never stranded.

The team's verdict, delivered through Tom Réti with the particular flatness of someone who has just watched a load-bearing assumption fail, was *concern*. The clock arithmetic itself was sound. The Prater chapter itself was correct. But — and this was the sentence that reframed the whole review — *it was correct because the author was disciplined, not because the engine made it so.*

The break they were proudest of was the one that cut deepest. In the engine, the check for scheduled events ran in exactly one place: inside `choose()`, the moment a player committed to a choice. That seemed reasonable until Dani Brooks asked the obvious adversarial question — *what if time advances some other way?* Nodes can advance the clock through their *entry effects*, not just through a choice. So the team built a small story in which a player walks into the canal node and the act of arriving pushes the clock past the 23:30 trigger. They were physically present at the event's location. The trigger time had passed. And the event did not fire. It sat there, dormant, until the *next* choice — at which point it fired late, and, compounding the error, routed the player to the "you witnessed the handoff" node, even though the clock proved they had arrived after it was over.

Sit with what that means. The engine itself was now narrating a lie. Not a typo in the prose, not an author's oversight — the *engine* telling the player they had witnessed an event they had demonstrably missed. And because EE-4, the prohibition on prose-vs-state lies, lives in the prose, the linter could not possibly see it. This was the engine manufacturing the exact category of falsehood the entire architecture was built to prevent. Tom's one-line summary in the report was the kind of sentence you remember: *the moment a new chapter advances time in an entry effect, the player will be told they saw something they missed.*

It did not stop there. The team found that when a choice's location effect happened to match an event's location, the event would silently hijack the player's intended destination — you'd choose to pass *through* the canal to the station and find yourself diverted to the handoff node, your chosen destination quietly discarded. They found that the linter's promise that every event has a *reachable* recovery was only graph-deep: it checked whether a path of arrows existed to the recovery node, never whether any player could actually traverse that path, so a recovery gated behind an impossible condition passed the build clean. They found that the rule guarding against an unwinnable clock only guarded one direction — it would block a deadline that could never bite, but a deadline whose *shortest possible path* already overshot it merely produced a warning, and shipped green. And they found that the no-midnight-wrap convention that keeps Prater's arithmetic honest was a convention and nothing more: write a naked `01:00` meaning "after one in the morning," and because the engine reads it as sixty minutes past midnight — a time already long past when the story starts at eight in the evening — the gate falls permanently open, and nothing in the linter notices.

Five findings, one of them a genuine blocker. And a single unifying theme that would echo from every other team: *the engine is honest because we were careful, not because it cannot be otherwise.*

---

## What Team 2 Found: The Endings That Shadowed Each Other

Priya Sundaram's team took the endings — the place where, more than anywhere else, EE-3 makes its proud promise: every reachable state resolves to *exactly one* ending, never zero, guaranteed by a mandatory unconditional default that catches everything the specific endings miss.

The good news they delivered first, and it was real: the default genuinely catches everything. There is no reachable configuration of the world that falls through to nothing. The core promise of EE-3 — that you never hit a dead end with no ending — holds. Eleanor Frost confirmed it from both directions and could not escape the catch-all.

But "exactly one" is a stronger claim than "at least one," and that is where Marcus Lee went looking. The resolver walked the endings in array order and returned the first whose conditions matched. That works fine until two endings can be true at the same time — and then *which* one you get is decided by nothing more principled than the order someone happened to list them in. The team built a story with a broad ending ("any positive score") listed before a specific one ("a high score"), and watched the specific ending become permanently unreachable: the broad one always grabbed the state first, and the specific one — the one the author surely cared about more — could never fire. The linter said nothing. It had no concept of one ending shadowing another.

Then Marcus did the thing that turns an academic finding into an urgent one: he pointed the same lens at *The Prater Line itself*. There, the "double-agent" ending sits in the array before the "clean extraction" ending, and there exists a combination of variables — the deal taken, the extraction clean — where both could match, and the double-agent ending would silently win. It happened to be harmless only because the authored choice-graph never actually produced that particular combination. An invariant the engine did not enforce, did not check, and could not see — holding only by the accident of how the story was wired. That is exactly the kind of latent landmine that survives one careful author and detonates under the next.

The smaller cuts were just as telling. Two endings whose conditions could both be true at once produced no warning. There was a `priority` field sitting right there in the ending's data type — the obvious mechanism for an author to say "this ending wins ties" — and the resolver ignored it completely. Dead code. An author who set it would be quietly, confidently wrong. Priya's recommendation was precise: surface the shadows and the overlaps as warnings, and either make `priority` real or delete it so it can't lie about what it does.

---

## What Team 3 Found: The Linter's Blind Spots, and the Truth About EE-4

Sasha Brandt's team had the assignment that cuts closest to the bone, because their job was to ask whether the linter — the build-blocking gate that is supposed to *be* the enforcement — actually enforces.

Their headline finding was a blocker, and it was beautifully, alarmingly simple. The rule that catches a dead-end node only fired when a node had *zero* choices. So Anton Weiss built a node with exactly one choice — an exit gated behind a keycard the player can never obtain, because nothing in the story ever grants it. A vault. You walk in, and you cannot walk out. No exit, no ending, the clock still ticking, and the linter pronounces the story clean — zero errors, zero warnings. A player can stroll into that room and be trapped there forever, and the build gate waves it through with a smile. Multiply that by three new chapters authored by three teams who don't have the muscle memory that keeps Prater clean, and you have three invisible vaults waiting.

Beneath the blocker was a whole family of false negatives, each one a place where the linter checked *symbol existence* but never *reachable meaning*. A condition could require a clue that no effect anywhere produces — write `add_clue 'cluX'` in one place and `has_clue 'clue'` in another, a one-character typo, and the gate silently never opens; the linter sees two valid-looking strings and says nothing. An effect could send the player to a location that doesn't exist in the story's location table, and the engine would dutifully set their position to garbage, quietly breaking every event that judged presence by location. A numeric variable could be compared against the literal string `'banana'`, and because the engine coerces unknown strings to zero, the comparison silently became "equals zero" and lint-passed. Nadia Ostrowski summed the pattern: the linter validated that a variable was *declared*, never that it was *readable* by anything; it would happily pass a story riddled with dead state and unreachable choices that the author believed were live.

And then came the finding that was less a bug than a confession about the architecture itself — and it was the most important thing the entire review produced. EE-4, the rule that prose must never lie about state, *has no mechanical enforcement whatsoever.* It cannot. Prose is free English, and the linter cannot read English. EE-4 was being upheld entirely by a hand-built audit document — the same audit, the team pointedly noted, that by its own record had missed the very same lie in Prater's burned ending three times before catching it. That is not enforcement. That is a careful colleague reading carefully, and the moment a second author touches a chapter, the audit is stale and nothing catches the drift.

The team's prescription drew a line that would shape the entire hardening philosophy. The mechanical false negatives — the soft-lock, the dead clue, the undefined location, the unsatisfiable choice — *belong in the linter now*, because they are machine-decidable. But the genuine prose-vs-state lie needs something that can read and reason about language, and that belongs to the AI-assist tooling still ahead of us. In their phrase: the editor *surfaces* the truth, the AI *judges* the prose. The linter's job is to catch everything a machine can prove. EE-4's last mile is not a linter problem; it is a different kind of problem entirely, and pretending otherwise was the quiet dishonesty we needed to name.

---

## What the Craft Trio Found: Where the Engine Fights the Author

The three analyst teams read code. The craft trio — Sam Whitlock, Rosa Calderón, and Diego Marín — did something different and equally vital: they imagined *authoring* the three upcoming chapters and asked where the engine would resist a perfectly reasonable creative intention. This is the friction you only feel from the writer's chair, and it predicts where a tool fails its user long before the user files a bug.

Their verdict was the most encouraging of the five — *on-track, with one real concern* — and it came with a genre-by-genre map that I found genuinely clarifying about which of our three new chapters would be easy and which would be hard.

The **mob story** they pronounced the engine's home turf, and the reason was instructive: *The Prater Line is already a relationship game.* Trust, suspicion, and debt are exactly numeric variables that shift on choices and gate later content; favors owed are exactly clue-flags; loyalty thresholds are exactly the kind of `greater-than` comparison the engine does in its sleep. A mob chapter maps onto the existing model almost one-to-one. The only mild awkwardness was organizational — many characters times many relationship axes makes for a lot of loose variables in a flat namespace, and the conditions are all AND-ed together with no native OR — but those are modeling chores, not walls. Diego's note was that the *editor*, not the engine, should make a cast of relationships legible; the engine needed nothing.

The **bank-heist** chapter they judged half-easy, half-hard. The engine's single strongest suit is precise timing: scheduled events keyed to the clock express "the alarm arms at two o'clock" and "the vault window is open between 1:55 and 2:00" cleanly and honestly — this is exactly the Prater handoff pattern, and it reads beautifully. Where the engine fights back is the idea of a guard who is *somewhere right now*: the model expresses "an event fired at a place," not "a moving character whose position you can query from anywhere." An author can fake it with a variable kept in sync by hand, and for a scripted heist that's survivable — Sam classified it "live with it" — but it is a known ceiling worth naming rather than discovering mid-build.

The **cave adventure** is where the trio found the one genuine gap, and they were unanimous and emphatic about it. A cave wants *resources that deplete* — a torch battery that drains with every move, air that runs low, water that rises with the clock. Light-and-dark the engine handles cleanly as a boolean flag. But a number that *ticks down as the player acts* has no primitive. To build it today, an author must hand-attach a "decrement" to the effects of every single choice — exactly the error-prone bookkeeping that the engine already treats as special for *one* resource, time, where the clock advances on its own and a dedicated lint rule guards it from biting unfairly. Miss the decrement on one choice and the torch burns forever; the linter, which understands time but not torches, ships the mistake green. Rosa's framing was the sharp one: the failure mode here isn't a build error, it's a *silently wrong number*, which is the worst kind. Their recommendation — generalize the clock into a first-class *resource* primitive that the engine advances and the linter understands — was the single most valuable forward-looking suggestion in the review, and the reason we deliberately set the cave aside as the chapter that needs an engine *feature*, not just the hardening, before it can be built honestly.

---

## The Analytical Spike: Proving the Existing Work

While the four teams hunted for breaks, a fifth stream did something quietly profound: it built the exhaustive validator and ran it against everything we'd already shipped.

The idea was the layered standard made real. Rather than reason about whether the existing chapters were safe, the analytical lead wrote a state-space walker that drives the *actual* engine — taking snapshots, restoring them, forking freely down every available choice — and visits every reachable state, keyed by a canonical fingerprint of the whole world: the current node, the clock, the location, every sorted list of clues and inventory and visited nodes, every variable. From each state it checks the invariants that matter: that exactly one ending resolves, that every event's recovery is genuinely reachable in real play, that no state strands the player with no choices and no ending, that no node or ending is an orphan.

The result was the reassurance the whole review needed as its counterweight. Walking *The Prater Line* exhaustively meant visiting 4,786 distinct reachable states — not a sample, not an approximation, the entire space — and every one of them passed every hard-safety invariant. The 4:10 sample chapter, sixteen states, the same. The shipped content was not merely *believed* safe; it was *proven* safe, to a standard no amount of clicking could ever reach. The walk even turned up two benign content observations in the sample — a choice that could never be reached and a node the events always intercepted — exactly the kind of thing the static linter structurally cannot see but a real engine-driven walk surfaces immediately.

And it was honest about its own limits, which mattered most. The walk can prove a state is reachable and prove the right ending resolves; it cannot read the prose at that node and tell you whether the words contradict the state. Every "this is fine" the walk produced about an ending rested, ultimately, on a human reading that the winning ending's words matched the world. The machine points the human at exactly the state to inspect; it cannot do the inspecting. This was the same boundary Team 3 had named from the other direction, and seeing two independent streams arrive at it gave it the weight of a law: the structure is machine-provable; the truth of the prose is not.

---

## The Verdict, and the Insight That Shaped the Fix

Imani Cross gathered all of it and delivered a verdict of a single word: *change.*

Not "stop" — the foundation was genuinely sound, and now provably so. Not "this is hopeless" — every flaw found was finite, specific, and fixable. *Change*, with a precise and slightly uncomfortable diagnosis underneath it: the engine's guarantees were upheld by authoring discipline rather than by the engine itself. For one hand-crafted chapter, written by the people who built the rules, that is survivable. For three new chapters in three genres written by three teams, those undefended traps are exactly what undisciplined authoring steps on first.

Two of the findings were true blockers that shipped green *today*: the events that fired late and lied, and the vault that trapped the player while lint passed clean. Around them sat a cluster of linter false negatives, all of the same character — the linter checked existence, never reachable meaning. One genuine missing feature, the cave's resource. And one architectural truth to make peace with: EE-4's prose layer cannot be mechanized and belongs to the AI tooling ahead.

Out of the verdict came the single insight that organized the entire repair, and it is worth stating plainly because it is the most important engineering decision in this whole story: **split the work into two nets.**

The first net is the *linter* — the build-blocking gate that runs on every change. Into it go only checks that are *sound*: checks that may occasionally miss a defect but will *never* flag a valid story. The reason is non-negotiable. A build-blocking rule that produces even one false positive doesn't just annoy; it *blocks a real author from shipping a perfectly good chapter*, and a tool that cries wolf gets switched off. So every new error-level rule had to be provably free of false positives, and any check that relied on a heuristic — anything that couldn't be certain — would ship as a *warning*, not an error.

The second net is the *exhaustive state-space walker* — the team's own validator, productionized. It catches the path-sensitive things the cheap static linter cannot: the choice that's dead only because the single path that reaches it sets a variable the wrong way. But it is expensive and it is imprecise about intent, so it does not belong in the build gate. It belongs as a *deliberate, per-chapter validation tool* — the thing you run on a finished chapter to prove it exhaustively, the analytical spine of the whole process.

Cheap and sound at the gate; exhaustive and deliberate as a tool. Two nets, each doing the job it is actually good at, neither pretending to be the other. Every fix that followed found its place in one net or the other.

---

## The Seven Changes, and Why Each Was Made the Way It Was

With the philosophy settled, the repair became a sequence of seven precise changes, each one built test-first, each one reviewed before the next began. Here is what each one did, and — because this is the part that matters most — *why it was done the way it was.*

**First, scheduled events were moved to fire on every arrival, from world-time.** This was the B1 blocker, and the riskiest change in the whole pass because it touched the engine's beating heart. The old code checked for events only inside `choose()`, which is *why* time advanced by a node's entry effects was invisible to the scheduler. The fix moved the check into `enter()` — the single function every arrival passes through, whether from a choice, the opening of the story, or a jump — and placed it *after* the entry effects run, so that any clock advance at all, from a choice or from arriving somewhere, is seen exactly once. When an event fires "present," the engine now diverts the narrative by re-entering the event's node, and because each event is marked completed the instant it fires, that re-entry cannot loop or double-fire. The same change deleted the old bug where a present event silently clobbered the author's chosen destination; routing now happens cleanly inside the arrival, and the author's intended destination is always honored unless an event legitimately diverts it. *Why this way:* events firing from world-time is the literal promise of EE-2, and the only place that promise can be kept honestly is the one chokepoint every clock advance flows through. We made the riskiest change first, on purpose, and gave it the most scrutiny — and the exhaustive walker later reproduced Prater's exact 4,786-state count, which is about as strong a proof as exists that the change introduced no regression.

**Second, the linter learned to see locations and clues.** A small new module built two symbol tables: every clue any effect can produce, and every location the story actually defines. With those in hand, two new rules: one that flags any effect or event that points at a location the story never declared, and one that flags any condition requiring a clue that nothing, anywhere, can produce. *Why this way:* both are *sound* by construction — they compare against the complete set of what the story can actually create, so they can only fire on a genuine dead reference, never on a valid one. They went straight into the build gate.

**Third, the soft-lock blocker was closed with sound static analysis.** This was B2, the vault. The fix detects when *every* exit from a non-ending node is provably dead — internally contradictory, or gated on a clue nothing produces, or requiring a flag nothing can ever make true — and makes that a build-blocking error. *Why this way, and why carefully:* because this rule blocks the build, it had to be impeccably sound. The detector returns "dead" only when it can *prove* deadness, and "I'm not sure" always resolves to "alive." It catches the vault — a flag nothing sets — with certainty, and leaves the cleverer, path-sensitive cases to the exhaustive walker, where they belong. This is the two-nets philosophy in miniature: the gate catches what it can prove; the tool catches the rest.

**Fourth, endings learned priority, and overlaps learned to warn.** The resolver now honors the `priority` field — highest priority among the satisfied endings wins, with array order breaking ties exactly as before, so nothing changes for stories that don't use priority. And a new warning surfaces any two endings that could both be true at once with no priority to disambiguate them — including, on the first run, the latent shadow buried in *The Prater Line*, exactly as Team 2 predicted. *Why a warning and not an error:* whether two conditions can truly co-occur is, in the general case, undecidable, and the mandatory default already guarantees safety. So this is advisory — it tells the author "these can collide; set a priority if you care which wins" — and it never blocks a build. A heuristic that cannot be certain has no business being an error. It belongs in the warning net, and there it sits.

**Fifth, the clock's three honesty gaps were closed.** Time literals are now checked to fall within the story's actual window, so the after-midnight `01:00` footgun that falls permanently open is caught at build time. The "shortest path already misses the deadline" case was promoted from a toothless warning to a real error — sound, because the bound it checks is a true lower bound, so if even the most optimistic path overshoots, the story is genuinely unwinnable. And the clock's display gained a day-offset suffix, so that two absolute times more than a day apart — like Prater's `26:10` deadline — no longer render as the same wall-clock string. *Why this way:* each gap was a place where the clock could quietly disagree with reality, and the clock is the one piece of state the whole engine treats as sacred. Notably, Prater's `26:10` sits *exactly* at its deadline bound, so the range check passes it cleanly — the kind of edge that a sound rule has to get right and did.

**Sixth, values learned their types.** A new rule checks that the numeric comparison operators are used on number-typed variables with genuinely numeric literals, catching the `'banana'`-coerced-to-zero silent failure. *Why this way:* it targets only the four numeric operators, deliberately leaving the time operators alone — because the time field is reserved and compares against clock literals, and flagging those would be a false positive. Soundness again: catch the real mismatch, never the valid comparison.

**Seventh, the exhaustive walker was made permanent.** The analytical spike — the validator that walks every reachable state driving the real engine — was productionized into a proper module and wired to run against both shipped chapters as a standing regression guard. *Why this way:* this is the second net made real. It is not in the build gate, because it is heavy and path-sensitive; it is a deliberate tool, the analytical spine we will point at each of the three new chapters as they're built, the thing that proves a chapter exhaustively rather than sampling it. That it reproduced the review's exact state counts on first run was the confirmation that the whole effort had landed where it should.

Seven changes. Two blockers closed, a family of false negatives sealed, the clock made honest, and the exhaustive validator enshrined as a permanent guardrail — all of it sorted cleanly into the two nets the verdict had called for.

---

## How the Repair Was Built

A finding is only as good as the fix that answers it, and the way the seven changes were built mattered nearly as much as the changes themselves.

Each change was treated as a discrete, self-contained task with its own complete cycle, and the cycle never varied. A fresh implementer — carrying no memory of the previous tasks, given only that one task's requirements, the interfaces it touched, and the rules that bound it — would write the failing test *first*, run it to watch it fail for the right reason, then write the smallest change that made it pass, run the full suite, commit, and review its own work before handing it back. Test-driven, every time, so that no change ever existed without a test that would catch its regression.

Then a *different* agent reviewed the result — pointedly not the one that wrote it, because a thing should be read by something other than the mind that produced it. The reviewer read the diff against two separate questions: does this match exactly what was asked, no more and no less; and is it well-built. It returned two verdicts and a list of findings sorted by real severity. Where a finding was genuine, it was fixed and re-checked; only when both verdicts came back clean did the next task begin. Seven tasks, fifteen commits, every one gated this way.

Underneath it all ran a ledger — a durable record of which tasks were complete and which commits carried them — so that progress survived even when memory didn't, and no finished work could ever be accidentally redone. And the effort was matched to the task: the mechanical transcriptions went to the cheapest, fastest models; the changes that needed judgment went to stronger ones; and the final whole-branch review — the one that had to hold the entire fifteen-commit change in its head and weigh it against every guarantee — went to the most capable model available, precisely because it was the one review that could not afford to miss anything.

The point of all that ceremony was not process for its own sake. It was that every change arrived small, tested, and read by a second pair of eyes — and that the four times a reviewer's finding turned out to be wrong, the disagreement surfaced *inside the process*, where it could be reasoned through, instead of slipping silently into the engine.

## The Part I'm Proudest Of: When We Said No to the Reviewers

There is a temptation, when a review process is running smoothly, to treat every reviewer finding as a fact to be implemented. It feels productive. It is also how you let plausible-but-wrong corrections quietly degrade the very thing you're trying to harden. Four times in this pass, a reviewer raised a finding and the right answer was not to implement it — and getting those four right is the part of this work I'd defend most strongly, because each required actually understanding the engine's semantics rather than nodding along.

The first: a reviewer wanted a guard added so the undefined-location rule wouldn't fire on an empty start location. We declined — because an empty start location genuinely *is* undefined and genuinely *should* be flagged, and the proposed guard would have suppressed a real error. The standard is "never flag a *valid* story," and an empty start location isn't valid.

The second cut deeper. A reviewer flagged the soft-lock detector as potentially producing a false positive: a variable set to a non-numeric string like `'open'`, then gated with an `is_true` check, might be wrongly called dead. The reasoning sounded right — until you check what `is_true` actually means in this engine. It is not JavaScript truthiness, where any non-empty string is true. It is defined as "the number value is greater than zero," and the number value of `'open'` is zero. So a gate requiring `is_true` on a variable that is only ever set to `'open'` is *genuinely* unreachable, and flagging it as dead is a *true* positive. The reviewer's fix would have suppressed a real dead-choice based on a misreading of the engine's own semantics. We declined it — and added a test that *locks in* the correct behavior, so no future "fix" can quietly reintroduce the misunderstanding.

The third was the most interesting, because the reviewer was wrong about the specific case but the investigation it triggered found a real, if obscure, hole. The reviewer worried about `equals` conditions with undefined values; that turned out to be a true positive, not a false one. But probing it surfaced a genuine edge: two `equals` conditions comparing `'5'` and `'5.0'` would be flagged as contradictory, even though at runtime both mean "equals five" — a real, if rare, false positive in a build-blocking rule. So we fixed the *actual* problem, not the reported one: we made the comparison coercion-aware, so it compares the values exactly as the engine does at runtime. The rare false positive vanished; the genuine contradictions are still caught.

The fourth: a reviewer, looking at the overlap warnings, suggested an optimization to reduce their number by skipping ending-pairs that share no variables. We declined, because it was *unsound* — two endings gating on entirely different variables can absolutely both be true in the same state, so skipping them would *miss real overlaps*. The "noise" the optimization would remove is in fact accurate information, and the author silences it correctly by setting priorities, not by the tool going blind.

The final whole-branch review — run on the most capable model we have, against the entire fifteen-commit branch — independently re-examined all four of these calls and confirmed each one was correct. That is the outcome I care about most. Not that the review found nothing to say, but that when the review and the implementation disagreed, we resolved it by reasoning from the engine's actual behavior rather than by deferring to whoever spoke last.

---

## Verification, and What It Buys Us

When the seventh change landed, the final review delivered its verdict: *ready to merge.* No critical issues, no important ones. The reviewer had traced every one of the six new build-blocking rules against the engine's runtime semantics and confirmed what the two-nets philosophy demanded — zero false positives, every rule incapable of blocking a valid story. Both shipped chapters still linted clean of new errors. The Task-1 recursion was proven to terminate. All six EE guarantees still held.

And then I ran the verification myself, because a claim of "done" is only worth the command that backs it: the full suite, 139 tests, every one passing; the type-checker, clean; the production build, succeeding. Not reported by a subagent — observed at the actual head of the actual branch.

What that buys us is not a feeling of safety. It is a *different kind* of safety than we had a week ago, and the difference is the whole point of this exercise. Before, the engine was correct because the people authoring it were careful. Now, a meaningful slice of that correctness is enforced by the engine and its build gate, whether the author is careful or not. The vault cannot ship. The typo'd clue is caught. The after-midnight literal is caught. The events fire from world-time and can no longer narrate a missed moment as witnessed. And for the path-sensitive cases that no static gate can catch, we have an exhaustive walker standing ready to prove each new chapter the way we proved the old ones.

The line that separates "correct by discipline" from "correct by construction" is the line this pass moved. We did not move all of it — EE-4's prose truth still lives beyond what any linter can reach, and waits for the AI tooling ahead. But we moved the part that was movable, and we were honest about the part that wasn't.

---

## The Counterfactual: What Skipping This Would Have Cost

It's worth being concrete about the road we didn't take, because the value of a review like this is invisible if you only look at the road you did.

Imagine we had skipped it and gone straight to authoring the three chapters. The heist, which leans hardest of the three on timed sequences, would have walked into the event-firing blocker within its first act — its guard patrols and arming alarms advance the clock as the player moves through the building, exactly the entry-effect time advance the old scheduler couldn't see. Events would have fired late. The engine would have told players they slipped past a guard they had, in fact, alerted. Not as a crash — as a quiet, confident falsehood baked into the narration.

Three teams authoring in parallel, none with the muscle memory that keeps Prater clean, would between them have laid at least one vault apiece — a node whose only exit is locked behind something the player can never get — and shipped all of them green. We would not have found those at build time. We'd have found them when a playtester got stuck, if we were lucky, and when a *player* got stuck, if we weren't. The one-character clue typo would have silently broken a gated reveal in some chapter, and the author would have defended the logic to your face because the linter agreed with them. And the latent ending shadow — harmless in Prater purely by the accident of its wiring — would have reappeared the instant a new author ordered their endings differently, silently handing the wrong finale to whichever slice of players had earned a different one.

None of those would have crashed. Every one of them would have eroded trust quietly, in exactly the way Sam warned about. And the cost of fixing them *then*, with three chapters of hand-authored prose already resting on the cracked foundation, would have been all three chapters re-audited and partly re-authored — plus the far heavier, unpriceable cost of no longer being sure which *other* quiet lies were still hiding in there.

The arithmetic is stark, and it is the whole argument: a few days of hardening now, against weeks of forensic re-authoring later on an engine you'd no longer fully trust. That asymmetry is easy to recite in the abstract and genuinely hard to honor when you're itching to start the fun part. We honored it. That's the discipline I'm gladdest we kept.

## In Their Own Words

Numbers and verdicts carry the facts, but the texture of a review lives in how the people who did it talk about it afterward. With the work finished, I asked the team to reflect.

**Mara Okonkwo-Vance**, on the event-firing blocker: "The thing that unsettled me wasn't that the bug was hard to find — it's that the original design looked so *reasonable*. Of course you check for events when the player makes a choice; that's the natural place to put it. It took deliberately asking 'what if time moves some other way' to see that an entire category of clock advance was simply invisible to the scheduler. The engine wasn't wrong on purpose. It was wrong in the most plausible-looking way available. Those are always the dangerous ones."

**Tom Réti**: "I wrote the sentence in the report — 'the player will be told they saw something they missed' — and then I had to sit with it, because that's the *engine* lying. Not the author, not the prose. The machine. We built this entire architecture to stop prose from lying about state, and there was the engine manufacturing exactly that lie, in the one place the linter can never look. That's the find I'm most relieved we made before three chapters of timed sequences went down on top of it."

**Dani Brooks**: "My favorite kind of break is the one that looks like nothing at all. A choice labeled 'pass through the canal to the station,' and you end up at the handoff instead, your chosen destination just — gone. No error, no crash. The story quietly takes you somewhere you didn't pick and behaves as though that was always the plan. A player would never file a bug for that. They'd just feel, vaguely, that the game wasn't *listening* to them."

**Priya Sundaram**, on endings: "We came in expecting to attack the catch-all — the 'every state resolves to something' promise — and that part held beautifully. What we didn't expect was that 'exactly *one* ending' was being decided by *list order*. The author writes their endings top to bottom, and the order they happen to type them in silently determines which one wins a tie. That isn't a rule. That's an accident wearing a rule's clothes."

**Eleanor Frost**: "I kept trying to escape the default, and I couldn't, and honestly that was a relief — it meant the floor was real. The unease was about the ceiling. There's a `priority` field sitting right there in the data, the obvious thing an author would reach for to say 'this ending matters more,' and the resolver simply never read it. An author would set it, feel responsible, and be wrong — and nothing in the world would tell them."

**Marcus Lee**: "It stopped being academic the instant I pointed the shadow analysis at *Prater Line* itself and found the double-agent ending sitting in front of the clean-extraction ending, with a state where both could fire. It only didn't break because the choice-graph never produced that exact combination. So the chapter was correct — by luck of the wiring, not by any rule. That's a landmine with the pin already pulled, waiting for the next author who runs the wires a little differently."

**Sasha Brandt**, on the soft-lock: "The vault is the one I'll be telling people about for a while. One choice, locked behind a key that exists nowhere in the story, and the build gate says *clean* — zero errors, zero warnings. You can walk a player into a room they can never leave and ship it green. The linter was checking that the words were spelled correctly, not that the door could open."

**Anton Weiss**: "Every false negative we found had the same shape. The linter knew whether a thing *existed* — is this variable declared, does this node id resolve — but never whether it could be *reached* or *read*. Declared but never readable. Spelled right but pointing at nothing. It's the difference between a spellchecker and an editor, and we'd been quietly trusting a spellchecker to do an editor's job."

**Nadia Ostrowski**: "The honest finding — the one I think matters most over time — is that EE-4 was never really enforced at all. Prose can't be checked by a linter, because a linter can't read. It was being held up by an audit document that, by its own log, had missed the same lie three separate times. We weren't *enforcing* prose truth. We were proofreading it, by hand, and calling that enforcement. Saying that out loud was uncomfortable and completely necessary."

**Sam Whitlock**, from the player's seat: "None of the engine findings feel like 'bugs' when you're playing. They feel like the game being subtly untrustworthy. You're told you witnessed something you missed; you're routed somewhere you didn't choose; a door won't open and you can't tell why. No single one of those produces a crash report. Together they produce the feeling that the world isn't paying attention to you — which is the one feeling a narrative game genuinely cannot survive."

**Rosa Calderón**: "What I kept running into was the cave. Light and dark, the engine handles like a dream. But a torch that *drains* — a number that ticks down every time you act — there's no real primitive for it. You have to remember to subtract from it on every single choice, by hand, and the day you forget on one choice, the torch burns forever and nothing warns you. The failure isn't a red error. It's a silently wrong number, which is the thing a writer trusts least, because I can't *see* it."

**Diego Marín**: "The mob story made me optimistic, honestly. Prater is already a relationship engine — trust, suspicion, debt, all of it numbers that move on choices. A crime chapter maps onto that almost perfectly; the engine doesn't need anything new for it. What it needs is for the *editor* to make a big cast of relationships legible, so the author isn't staring at a flat soup of variables. That's a tooling problem, not an engine problem — and it's a good problem to have."

**The analytical lead**, on the exhaustive walk: "Four thousand seven hundred and eighty-six states for *Prater Line*. Not a sample — all of them. Every one passed. That's a sentence you simply cannot say after playtesting; the most a human can honestly claim is 'the dozen paths I tried looked fine.' But the walk also taught me humility about its own reach: it can prove the structure down to the last state and still not read a single word of the prose. The machine can tell you exactly *which* state to look at. It can't tell you whether the words there are true."

**Imani Cross**, closing the review: "The verdict was always going to be one word, and the word was 'change.' Not because the engine was bad — it was good, and now we can prove it. But 'good because the people building it are careful' and 'good because it cannot be otherwise' are different kinds of good, and only one of them survives being handed to three new teams. Our job was to find the gap between those two. We found it, and we closed the part of it that can be closed. The part that can't — the prose — we at least stopped lying to ourselves about."

## The One Finding We Couldn't Fix

The hardening closed every gap a machine can decide. It left exactly one finding standing — and we left it standing on purpose, because pretending to fix it would have been worse than naming it plainly.

EE-4 — the rule that prose must never contradict the state behind it — cannot be enforced by a linter, for the simplest possible reason: prose is English, and a linter cannot read. A rule can prove that a variable is set on every path that reaches a node; it cannot prove that the paragraph at that node doesn't cheerfully claim the opposite. The team arrived at this same wall from two independent directions — Team 3 reading the linter's limits, the analytical lead walking up against it from inside the exhaustive validator — and that convergence is what gives it the weight of a law rather than an opinion. The structure is machine-provable. The truth of the words is not.

But "cannot be a linter" is emphatically not "cannot be done." It is a differently shaped problem, and it has a differently shaped answer already waiting on the roadmap: the AI-assist tooling still ahead of us. The division of labor is, in fact, already clear from this very review. The editor's job is to *surface* — for any given node, it can compute and show the author exactly which flags are provably set and unset on every path that arrives there. That is pure structure, fully decidable, exactly what the state-space machinery already produces. The AI's job is to *judge* — handed a node where the companion flag is provably false on every arriving path, read the paragraph and notice that the prose grips an arm that isn't there. A model that can read prose, given the structural truth the editor surfaces, can finally do the one thing the linter never could: hold the words and the world side by side and catch them disagreeing.

So the honest status of EE-4 after this pass is not "unsolved." It is "correctly located." We moved it out of the linter — where it had been faked by a hand audit that missed the same lie three times — and set it on the desk of the only tool that can actually do the work. That relocation is itself a result, and not a small one. The most expensive mistakes in software are the ones where you believe a thing is handled because something *adjacent* to it is handled, where a spellchecker's green light gets quietly read as an editor's blessing. By naming that EE-4 was never truly enforced, and stating precisely where its enforcement does belong, we've made sure that the next person who trusts the build gate will be trusting it for exactly what it does and nothing more. An honest boundary is worth more than a false guarantee, every single time.

## Where This Leaves Us

The foundation is hardened, and the road forward is clearer for it.

The three new chapters can now be authored on an engine that defends its own guarantees. The mob story will be the easiest — it is, as the craft trio said, the engine's home turf, a relationship game on an engine that was practically born to run one. The heist will lean on the engine's strongest muscle, precise clock-driven timing, with one known ceiling around moving guards that we'll script around rather than fight. And the cave waits on the one thing this pass deliberately did *not* build: the resource-depletion primitive, the generalization of the clock into a first-class draining resource that an author declares and the linter understands. That is a feature, not a fix, and it earns its own small design pass before the cave can be told honestly. Pulling it out of the hardening was a deliberate choice — you don't smuggle green-field features into a pass whose job is to close verified holes.

Beyond the chapters, the story editor still waits, paused exactly where we left it, behind the chapters that will give it real content to open. And the AI-assist tooling — the place where EE-4's last mile finally gets a tool that can read prose against the state behind it — sits on the horizon as the natural answer to the one finding this review could only name, not fix.

But all of that is tomorrow's work. Tonight, the spine is sound, and we can prove it. The team did exactly what I asked of them: they tried to break the engine, they succeeded in ways that mattered, and because they found the cracks while they were cheap, we sealed them before a single new chapter went down on top of them. That is the entire reason you run the review before you build, and this is the rare, satisfying case where the process paid off exactly as designed.

The engine that will carry three new stories — and, eventually, the real one — is steadier tonight than it was this morning. Not because we hoped it was. Because we checked.

---

*End of account. Fifteen commits, seven changes, two blockers closed, six new sound rules, one exhaustive validator made permanent, four reviewer findings correctly overruled — and one engine that now keeps more of its own promises than it did before the team went looking for the places it didn't.*

---

## Appendix: The New Enforcement at a Glance

For the record, here is everything the engine gained, sorted by the net each piece lives in.

**The build gate** — sound and build-blocking; by construction, none of these can flag a valid story, only a genuinely broken one:

- **Events fire on arrival.** Scheduled events now fire from world-time on every entry, not only on choices, judged at the fully-arrived node — so a present event can no longer narrate a missed moment as witnessed, and an event can no longer hijack the author's chosen destination.
- **UNDEFINED_LOCATION** — an effect, event, or start position pointing at a location the story never declared.
- **DEAD_CLUE_REFERENCE** — a condition requiring a clue that no effect anywhere can produce.
- **SOFT_LOCK** — a non-ending node whose every exit is provably, permanently locked (the vault).
- **DEADLINE_UNWINNABLE** — a story whose shortest possible path already overshoots its deadline.
- **TIME_LITERAL_OUT_OF_RANGE** — a time literal that falls outside the story's own window (the after-midnight footgun).
- **TYPE_MISMATCH** — a numeric comparison against a non-numeric value or a non-number variable.

**The warning net** — advisory heuristics that surface a risk without ever blocking a build:

- **OVERLAPPING_ENDINGS** — two endings that could both be satisfied at once, with no priority to decide between them.
- Ending **priority** is now honored by the resolver, so an author can make the tiebreak explicit rather than leaving it to list order.

**The deliberate tool** — exhaustive, run per chapter rather than on every build:

- **The state-space walker** — drives the real engine through every reachable state of a chapter and proves the hard-safety invariants exhaustively, the way *The Prater Line* was proven across all 4,786 of its states.

**Still beyond the gate, by its nature:**

- **EE-4 prose truth** — the guarantee that the words never contradict the state behind them — cannot be mechanized, because no linter can read English. It waits for the AI-assist tooling ahead, where a model that *can* read prose will judge it against the state the editor surfaces.
