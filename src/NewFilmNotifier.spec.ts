import {NewFilmNotifier} from "./NewFilmNotifier";
import {SimpleShowing} from "./domain/SimpleShowing";
import {Film} from "./lib/OdeonApi/odeonTypes";
import {add, format} from "date-fns";

const mockGetNextShowingByFilmForCinema = jest.fn();
const mockInitialise = jest.fn();
jest.mock("./CinemaInfoService", () => ({
    CinemaInfoService: jest.fn().mockImplementation(() => ({
        getNextShowingByFilmForCinema: mockGetNextShowingByFilmForCinema,
        initialise: mockInitialise
    }))
}));
const mockGetRecordById = jest.fn();
const mockPutRecord = jest.fn();
jest.mock("./lib/DynamoDBHelper", () => ({
    DynamoDBHelper: jest.fn().mockImplementation(() => ({
        getRecordById: mockGetRecordById,
        putRecord: mockPutRecord
    }))
}));
const mockPost = jest.fn();
jest.mock("twitter-lite", () => {
    return jest.fn().mockImplementation(() => ({
        post: mockPost
    }));
});

describe("NewFilmNotifier", () => {
    const film1 = {
        "id": "filmid1",
        "title": {
            "text": "Film 1",
        }
    } as Film;
    const film2 = {
        "id": "filmid2",
        "title": {
            "text": "Film 2",
        }
    } as Film;
    const showing1 = new SimpleShowing("film1", film1.id, film1.title.text, add(new Date(), {days: 1}));
    const showing2 = new SimpleShowing("film2", film2.id, film2.title.text, add(new Date(), {days: 2}));
    beforeEach(() => {
        mockGetNextShowingByFilmForCinema.mockResolvedValue(new Map<string, SimpleShowing>([
            ["film1", showing1],
            ["film2", showing2]
        ]));
        mockGetRecordById.mockResolvedValueOnce(film1);
        mockGetRecordById.mockResolvedValueOnce(undefined);
    });
    test("should successfully identify new films and process them", async () => {
        const nfn = new NewFilmNotifier("table-name", "test", "test", "test", "test")

        await nfn.check();
        expect(mockGetNextShowingByFilmForCinema).toBeCalledWith(150, expect.any(Date), 2);
        expect(mockGetRecordById).toHaveBeenNthCalledWith(1, "film1");
        expect(mockGetRecordById).toHaveBeenNthCalledWith(2, "film2");
        expect(mockPutRecord).toHaveBeenCalledTimes(1);
        expect(mockPutRecord).toBeCalledWith(showing2.toRecord());
        expect(mockPost).toBeCalledWith("statuses/update", {
            status: `${showing2.film.title} starts showing on ${format(showing2.date, "do MMM")}!
For booking see: https://beta.odeon.co.uk/films/film/${showing2.film.id}/?cinema=150`
        });
        expect(mockPost).toHaveBeenCalledTimes(1);
    });
    test("should successfully identify new films and process them for a customised number of days", async () => {
        const nfn = new NewFilmNotifier("table-name", "test", "test", "test", "test")

        await nfn.check(150, 1);
        expect(mockGetNextShowingByFilmForCinema).toBeCalledWith(150, expect.any(Date), 1);
    });
    test("should successfully identify new films process but not send twitter or store record if dry run enabled", async () => {
        const nfn = new NewFilmNotifier("table-name", "test", "test", "test", "test")

        await nfn.check(150, 2, true);
        expect(mockGetRecordById).toHaveBeenNthCalledWith(1, "film1");
        expect(mockGetRecordById).toHaveBeenNthCalledWith(2, "film2");
        expect(mockPutRecord).toHaveBeenCalledTimes(0);
        expect(mockPost).toHaveBeenCalledTimes(0);
    });

});
