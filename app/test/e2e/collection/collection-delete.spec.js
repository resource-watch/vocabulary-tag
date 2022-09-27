const nock = require('nock');
const chai = require('chai');
const mongoose = require('mongoose');
const Collection = require('models/collection.model');
const { USERS } = require('../utils/test.constants');
const { createCollection, mockGetUserFromToken, ensureCorrectError } = require('../utils/helpers');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Delete collections', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Collection.deleteMany({}).exec();
    });

    it('Deleting a collection while not being authenticated should return a 401', async () => {
        const collection = await new Collection(createCollection({
            application: 'rw',
            ownerId: USERS.USER.id
        })).save();

        const response = await requester
            .delete(`/api/v1/collection/${collection._id}`);

        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Deleting a collection with valid id that does not exists while authenticated should return a 404', async () => {
        mockGetUserFromToken(USERS.USER);
        const fakeUUID = mongoose.Types.ObjectId();

        const response = await requester
            .delete(`/api/v1/collection/${fakeUUID}`)
            .set('Authorization', `Bearer abcd`);

        response.status.should.equal(404);
        ensureCorrectError(response.body, 'Collection not found');
    });

    it('Deleting a collection as USER should return 200 and data from deleted fav', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const collectionOne = await new Collection(createCollection({
            application: 'rw',
            ownerId: USERS.USER.id
        })).save();

        const collectionTwo = await new Collection(createCollection({ ownerId: USERS.MANAGER.id })).save();

        const response = await requester
            .delete(`/api/v1/collection/${collectionOne._id}`)
            .set('Authorization', `Bearer abcd`);

        response.status.should.equal(200);
        response.body.data.id.should.equal(collectionOne._id.toString());
        response.body.data.attributes.application.should.equal(collectionOne.application);
        response.body.data.attributes.ownerId.should.equal(collectionOne.ownerId);

        const findDeletedCollection = await Collection.find({ ownerId: { $eq: USERS.USER.id } }).exec();
        findDeletedCollection.should.be.an('array').with.lengthOf(0);

        const findExistingCollections = await Collection.find().exec();
        findExistingCollections.should.be.an('array').with.lengthOf(1);

        const collectionNames = findExistingCollections.map((layer) => layer.name);
        collectionNames.should.contain(collectionTwo.name);
    });

    it('Deleting a favourite as ADMIN should return 200 and data from deleted fav', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const collectionOne = await new Collection(createCollection({
            application: 'rw',
            ownerId: USERS.USER.id
        })).save();

        const collectionTwo = await new Collection(createCollection({ ownerId: USERS.MANAGER.id })).save();

        const response = await requester
            .delete(`/api/v1/collection/${collectionOne._id}`)
            .set('Authorization', `Bearer abcd`);

        response.status.should.equal(200);
        response.body.data.id.should.equal(collectionOne._id.toString());
        response.body.data.attributes.application.should.equal(collectionOne.application);
        response.body.data.attributes.ownerId.should.equal(collectionOne.ownerId);

        const findDeletedCollection = await Collection.find({ ownerId: { $eq: USERS.USER.id } }).exec();
        findDeletedCollection.should.be.an('array').with.lengthOf(0);

        const findExistingCollections = await Collection.find().exec();
        findExistingCollections.should.be.an('array').with.lengthOf(1);

        const collectionNames = findExistingCollections.map((layer) => layer.name);
        collectionNames.should.contain(collectionTwo.name);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Collection.deleteMany({}).exec();
    });
});
