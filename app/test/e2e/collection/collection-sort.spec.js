const nock = require('nock');
const chai = require('chai');
const Collection = require('models/collection.model');
const { USERS } = require('../utils/test.constants');
const { createCollection, mockGetUserFromToken } = require('../utils/helpers');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

let collectionOne;
let collectionTwo;
let collectionThree;

describe('Sort collections tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        await Collection.deleteMany({}).exec();

        collectionOne = await new Collection(createCollection({ name: 'cartodb', ownerId: USERS.USER.id })).save();
        collectionTwo = await new Collection(createCollection({ name: 'json', ownerId: USERS.USER.id })).save();
        collectionThree = await new Collection(createCollection({ name: 'gee', ownerId: USERS.USER.id })).save();

        requester = await getTestServer();
    });

    it('Sort collections by non-existent field (implicit order)', async () => {
        mockGetUserFromToken(USERS.USER);
        const response = await requester
            .get(`/api/v1/collection`)
            .set('Authorization', `Bearer abcd`)
            .query({ sort: 'potato' });

        const collectionsOne = response.body.data;

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(3);
        response.body.should.have.property('links').and.be.an('object');

        const collectionIds = collectionsOne.map((collection) => collection.id);

        collectionIds.should.contain(collectionOne._id.toString());
        collectionIds.should.contain(collectionTwo._id.toString());
        collectionIds.should.contain(collectionThree._id.toString());
    });

    it('Sort collections by name (implicit order)', async () => {
        mockGetUserFromToken(USERS.USER);
        const response = await requester
            .get(`/api/v1/collection`)
            .set('Authorization', `Bearer abcd`)
            .query({ sort: 'name' });
        const collectionsOne = response.body.data;

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(3);
        response.body.should.have.property('links').and.be.an('object');

        const collectionIdsOne = collectionsOne.map((collection) => collection.id);

        collectionIdsOne[0].should.equal(collectionOne._id.toString());
        collectionIdsOne[1].should.equal(collectionThree._id.toString());
        collectionIdsOne[2].should.equal(collectionTwo._id.toString());
    });

    it('Sort collections by name (explicit asc order)', async () => {
        mockGetUserFromToken(USERS.USER);
        const response = await requester
            .get(`/api/v1/collection`)
            .set('Authorization', `Bearer abcd`)
            .query({ sort: '+name' });

        const collectionsOne = response.body.data;

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(3);
        response.body.should.have.property('links').and.be.an('object');

        const collectionIdsOne = collectionsOne.map((collection) => collection.id);

        collectionIdsOne[0].should.equal(collectionOne._id.toString());
        collectionIdsOne[1].should.equal(collectionThree._id.toString());
        collectionIdsOne[2].should.equal(collectionTwo._id.toString());
    });

    it('Sort collections by name (explicit desc order)', async () => {
        mockGetUserFromToken(USERS.USER);
        const response = await requester
            .get(`/api/v1/collection`)
            .set('Authorization', `Bearer abcd`)
            .query({ sort: '-name' });

        const collectionsOne = response.body.data;

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(3);
        response.body.should.have.property('links').and.be.an('object');

        const collectionIdsOne = collectionsOne.map((collection) => collection.id);

        collectionIdsOne[0].should.equal(collectionTwo._id.toString());
        collectionIdsOne[1].should.equal(collectionThree._id.toString());
        collectionIdsOne[2].should.equal(collectionOne._id.toString());
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(async () => {
        await Collection.deleteMany({}).exec();
    });
});
