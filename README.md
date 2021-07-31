# Cinema Information Service

A simple library intended to simplify obtaining Odeon cinema listing information. 

# Usage

```typescript
import {CinemaInfoService} from "cinema-information-service";

const cis = new CinemaInfoService();
await cis.initialise();
// Obtain cinema showings for BFI Imax from today until 2 days time.
cis.getNextShowingByFilmForCinema(150, new Date(), 2)
```