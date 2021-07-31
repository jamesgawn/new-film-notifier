# New Film Notifier

A library to automate tweeting when new films become available for booking at Odeon. 

# Usage

```typescript
import {NewFilmNotifier} from "cinema-information-service";

const nfn = new NewFilmNotifier("dynamoDBtable", "twitterConsumerKey", "twitterConsumerSecret", "twitterAccessTokenKey", "twitterAccessTokenSecret");

// Check for films at the BFI IMAX, looking forward 30 days.
nfn.check(150, 30, false)
```