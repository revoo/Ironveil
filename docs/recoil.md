# Charge-scaled inertial recoil — 1.1.1 solo

Cannon shots now impart a charge-scaled impulse to a damped presentation spring. The turret slides backward and returns with a small overshoot; the hull gets a smaller backward kick along the shot's world bearing. Full charge produces roughly five times the tap response. This is cosmetic: driving velocity, collision, aim authority and camera tracking remain unchanged.

The spring uses an analytical update, so recovery stays consistent across render rates and long frames. Motion is bounded, pauses with solo play and clears on reset, death or loss of authorized visibility. Reduced motion clears and suppresses recoil. Cancelled and vented charges produce no firing impulse.

Recoil comes from confirmed shot events, including visible AI tanks. Shot identity and bearing pass through the existing team visibility filter; visible shells do not disclose their hidden owner's identity. Reappearing contacts cannot replay old firing events. The event shape advances protocol/content versions to 7/8.

Tests preceded implementation. Initial component failures covered inertial buildup/recovery, charge scaling, direction and authorized shot metadata. Browser acceptance first failed on the missing recoil diagnostics before renderer integration. Six new unit tests cover spring motion, frame-rate consistency, bounds/reset and the observation boundary. Three browser tests cover real Worker tap/full shots, unchanged authority position, cancellation/vent suppression, reduced motion and AI hide/reveal lifecycle.

Local validation and the refreshed standalone package are recorded below after verification. No additional CI run is planned for this small presentation patch; the prior substantial tactical AI checkpoint passed CI. Owner evaluation of recoil feel remains pending.

## Verified delivery

- All 145 unit tests pass. Strict TypeScript and the production build pass.
- The complete Chromium browser run passed 35 checks and missed the vent recovery state in one new check because its polling backed off past the short state. After switching that assertion to 50 ms polling, all three focused recoil checks pass, covering the remaining browser scenario. No product correction was needed for that assertion.
- All three offline acceptance tests pass against the actual refreshed package, including a full browser-process restart without networking and missing Worker cache repair.
- Source checkpoint: `2cc0499ca1ee822aba6b70414f9d143898cb0823`, pushed to the existing repository. Package version: `1.1.1-solo`.
- Current `release/ironveil-solo-v1.tar.gz` SHA-256: `d035f4788f5be82907585c1453fba7cf0411d021d6a425ee868b7afcaef0994f`; sidecar verified. This supersedes the historical archive checksum in the AI report.
- Playable standalone build: http://127.0.0.1:4180/. Close every old Ironveil tab and reopen to activate the updated offline assets.

The existing Phaser bundle-size warning remains. Automated checks verify motion and lifecycle behavior; the owner's feel/readability playtest remains pending.
