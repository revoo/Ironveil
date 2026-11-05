# Charge-scaled inertial recoil — 1.1.1 solo

Cannon shots now impart a charge-scaled impulse to a damped presentation spring. The turret slides backward and returns with a small overshoot; the hull gets a smaller backward kick along the shot's world bearing. Full charge produces roughly five times the tap response. This is cosmetic: driving velocity, collision, aim authority and camera tracking remain unchanged.

The spring uses an analytical update, so recovery stays consistent across render rates and long frames. Motion is bounded, pauses with solo play and clears on reset, death or loss of authorized visibility. Reduced motion clears and suppresses recoil. Cancelled and vented charges produce no firing impulse.

Recoil comes from confirmed shot events, including visible AI tanks. Shot identity and bearing pass through the existing team visibility filter; visible shells do not disclose their hidden owner's identity. Reappearing contacts cannot replay old firing events. The event shape advances protocol/content versions to 7/8.

Tests preceded implementation. Initial component failures covered inertial buildup/recovery, charge scaling, direction and authorized shot metadata. Browser acceptance first failed on the missing recoil diagnostics before renderer integration. Six new unit tests cover spring motion, frame-rate consistency, bounds/reset and the observation boundary. Three browser tests cover real Worker tap/full shots, unchanged authority position, cancellation/vent suppression, reduced motion and AI hide/reveal lifecycle.

Local validation and the refreshed standalone package are recorded below after verification. No additional CI run is planned for this small presentation patch; the prior substantial tactical AI checkpoint passed CI. Owner evaluation of recoil feel remains pending.
