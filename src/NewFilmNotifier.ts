import {Base} from "./lib/Base";
import {DynamoDBHelper} from "./lib/DynamoDBHelper";
import {format} from "date-fns";
import Twitter from "twitter-lite";
import {CinemaInfoService} from "./CinemaInfoService";
import {FilmRecord} from "./domain/FilmRecord";

export class NewFilmNotifier extends Base {
    dynamoDBTableName: string;
    twitterConsumerKey: string;
    twitterConsumerSecret: string;
    twitterAccessTokenKey: string;
    twitterAccessTokenSecret: string;

    constructor(dynamoDBTableName: string, twitterConsumerKey: string, twitterConsumerSecret: string, twitterAccessTokenKey: string, twitterAccessTokenSecret: string) {
        super();
        this.dynamoDBTableName = dynamoDBTableName;
        this.twitterConsumerKey = twitterConsumerKey;
        this.twitterConsumerSecret = twitterConsumerSecret;
        this.twitterAccessTokenKey = twitterAccessTokenKey;
        this.twitterAccessTokenSecret = twitterAccessTokenSecret;
    }

    async check(siteId = 150, numberOfDaysToLookForward = 2, dryRun = false) {
        const cis = new CinemaInfoService();
        try {
            await cis.initialise();
        } catch (err) {
            this.log.error("Failed to initialise cinema info service", err);
            throw err;
        }
        const dbh = new DynamoDBHelper(this.dynamoDBTableName);
        const twitter = new Twitter({
            consumer_key: this.twitterConsumerKey,
            consumer_secret: this.twitterConsumerSecret,
            access_token_key: this.twitterAccessTokenKey,
            access_token_secret: this.twitterAccessTokenSecret
        });
        const upcomingFilms = await cis.getNextShowingByFilmForCinema(siteId, new Date(), numberOfDaysToLookForward);
        this.log.info("Retrieved upcoming films", {
            upcomingFilms: Array.from(upcomingFilms.values())
        });
        for (const [filmId, showing] of upcomingFilms) {
            const persistedFilm = await dbh.getRecordById<FilmRecord>(filmId);
            // If not previously seen, then do things
            if (!persistedFilm) {
                // Store the film has been identified
                if (!dryRun) {
                    await dbh.putRecord<FilmRecord>(showing.toRecord());
                }
                // Tweet to let people know it's available for booking
                // eslint-disable-next-line max-len
                const newFilmTweet = `${showing.film.title} starts showing on ${format(showing.date, "do MMM")}!
For booking see: https://beta.odeon.co.uk/films/film/${showing.film.id}/?cinema=150`;
                if (!dryRun) {
                    this.log.info("Tweeting new film alert", {
                        tweet: newFilmTweet
                    });
                    await twitter.post("statuses/update", {
                        status: newFilmTweet
                    });
                } else {
                    this.log.info("Not tweeted, but here's the message.", {
                        tweet: newFilmTweet
                    });
                }
            } else {
                this.log.info(`Found existing film entry for ${showing.film.id} - ${showing.film.title}. No action taken.`);
            }
        }
    }
}