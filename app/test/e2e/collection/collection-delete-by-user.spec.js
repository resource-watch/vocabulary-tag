const nock = require('nock');
const chai = require('chai');
const Collection = require('models/collection.model');
const { USERS } = require('../utils/test.constants');
const { createCollection, mockGetUserFromToken, ensureCorrectError } = require('../utils/helpers');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Delete collections by user id', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Collection.deleteMany({}).exec();
    });

    it('Deleting a collection by user while not being authenticated should return a 401', async () => {
        const response = await requester
            .delete(`/api/v1/collection/by-user/${USERS.USER.id}`);

        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Deleting a collection by user while being authenticated as USER that is not the owner of collections or admin should return a 403 "Forbidden" error', async () => {
        mockGetUserFromToken(USERS.MANAGER);
        await new Collection(createCollection({
            application: 'rw',
            ownerId: USERS.USER.id
        })).save();

        const response = await requester
            .delete(`/api/v1/collection/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`);

        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Forbidden');
    });

    it('Deleting all collections of an user while being authenticated as ADMIN should return a 200 and all collections deleted', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const collectionOne = await new Collection(createCollection({
            env: 'production', application: 'rw', ownerId: USERS.USER.id
        })).save();
        const collectionTwo = await new Collection(createCollection({
            env: 'staging', application: 'gfw', ownerId: USERS.USER.id
        })).save();
        const fakeCollectionFromAdmin = await new Collection(createCollection({
            env: 'production', application: 'rw', ownerId: USERS.ADMIN.id
        })).save();
        const fakeCollectionFromManager = await new Collection(createCollection({
            env: 'staging', application: 'rw', ownerId: USERS.MANAGER.id
        })).save();

        nock(process.env.GATEWAY_URL)
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const response = await requester
            .delete(`/api/v1/collection/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();

        response.status.should.equal(200);
        response.body.data.map((elem) => elem.id).sort().should.deep.equal([collectionOne.id, collectionTwo.id].sort());

        const findCollectionByUser = await Collection.find({ ownerId: { $eq: USERS.USER.id } }).exec();
        findCollectionByUser.should.be.an('array').with.lengthOf(0);

        const findAllCollections = await Collection.find({}).exec();
        findAllCollections.should.be.an('array').with.lengthOf(2);

        const collectionNames = findAllCollections.map((collection) => collection.name);
        collectionNames.should.contain(fakeCollectionFromManager.name);
        collectionNames.should.contain(fakeCollectionFromAdmin.name);
    });

    it('Deleting all collections of an user while being authenticated as a microservice should return a 200 and all collections deleted', async () => {
        mockGetUserFromToken(USERS.MICROSERVICE);
        const collectionOne = await new Collection(createCollection({
            env: 'production', application: 'rw', ownerId: USERS.USER.id
        })).save();
        const collectionTwo = await new Collection(createCollection({
            env: 'staging', application: 'gfw', ownerId: USERS.USER.id
        })).save();
        const fakeCollectionFromAdmin = await new Collection(createCollection({
            env: 'production', application: 'rw', ownerId: USERS.ADMIN.id
        })).save();
        const fakeCollectionFromManager = await new Collection(createCollection({
            env: 'staging', application: 'rw', ownerId: USERS.MANAGER.id
        })).save();

        nock(process.env.GATEWAY_URL)
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const response = await requester
            .delete(`/api/v1/collection/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();

        response.status.should.equal(200);
        response.body.data.map((elem) => elem.id).sort().should.deep.equal([collectionOne.id, collectionTwo.id].sort());

        const findCollectionByUser = await Collection.find({ ownerId: { $eq: USERS.USER.id } }).exec();
        findCollectionByUser.should.be.an('array').with.lengthOf(0);

        const findAllCollections = await Collection.find({}).exec();
        findAllCollections.should.be.an('array').with.lengthOf(2);

        const collectionNames = findAllCollections.map((collection) => collection.name);
        collectionNames.should.contain(fakeCollectionFromManager.name);
        collectionNames.should.contain(fakeCollectionFromAdmin.name);
    });

    it('Deleting a collection owned by a user that does not exist as a MICROSERVICE should return a 404', async () => {
        mockGetUserFromToken(USERS.MICROSERVICE);

        nock(process.env.GATEWAY_URL)
            .get(`/auth/user/potato`)
            .reply(403, {
                errors: [
                    {
                        status: 403,
                        detail: 'Not authorized'
                    }
                ]
            });

        const deleteResponse = await requester
            .delete(`/api/v1/collection/by-user/potato`)
            .set('Authorization', `Bearer abcd`)
            .send();

        deleteResponse.status.should.equal(404);
        deleteResponse.body.should.have.property('errors').and.be.an('array');
        deleteResponse.body.errors[0].should.have.property('detail').and.equal(`User potato does not exist`);
    });

    it('Deleting all collections of an user while being authenticated as that same user should return a 200 and all collections deleted', async () => {
        mockGetUserFromToken(USERS.USER);
        const collectionOne = await new Collection(createCollection({
            env: 'production', application: 'rw', ownerId: USERS.USER.id
        })).save();
        const collectionTwo = await new Collection(createCollection({
            env: 'staging', application: 'gfw', ownerId: USERS.USER.id
        })).save();
        const fakeCollectionFromAdmin = await new Collection(createCollection({
            env: 'production', application: 'rw', ownerId: USERS.ADMIN.id
        })).save();
        const fakeCollectionFromManager = await new Collection(createCollection({
            env: 'staging', application: 'rw', ownerId: USERS.MANAGER.id
        })).save();

        nock(process.env.GATEWAY_URL)
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const response = await requester
            .delete(`/api/v1/collection/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();

        response.status.should.equal(200);
        response.body.data.map((elem) => elem.id).sort().should.deep.equal([collectionOne.id, collectionTwo.id].sort());

        const findCollectionByUser = await Collection.find({ ownerId: { $eq: USERS.USER.id } }).exec();
        findCollectionByUser.should.be.an('array').with.lengthOf(0);

        const findAllCollections = await Collection.find({}).exec();
        findAllCollections.should.be.an('array').with.lengthOf(2);

        const collectionNames = findAllCollections.map((collection) => collection.name);
        collectionNames.should.contain(fakeCollectionFromManager.name);
        collectionNames.should.contain(fakeCollectionFromAdmin.name);
    });

    it('Deleting collections from a user should delete them completely from a database (large number of collections)', async () => {
        mockGetUserFromToken(USERS.USER);

        await Promise.all([...Array(100)].map(async () => {
            await new Collection(createCollection({
                env: 'production', application: 'rw', ownerId: USERS.USER.id
            })).save();
            await new Collection(createCollection({
                env: 'staging', application: 'gfw', ownerId: USERS.USER.id
            })).save();
        }));

        nock(process.env.GATEWAY_URL)
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const deleteResponse = await requester
            .delete(`/api/v1/collection/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();

        deleteResponse.status.should.equal(200);
        deleteResponse.body.should.have.property('data').with.lengthOf(200);

        const findCollectionByUser = await Collection.find({ ownerId: { $eq: USERS.USER.id } }).exec();
        findCollectionByUser.should.be.an('array').with.lengthOf(0);
    });

    it('Deleting all collections of an user while being authenticated as USER should return a 200 and all collections deleted - no collections in the db', async () => {
        mockGetUserFromToken(USERS.USER);

        nock(process.env.GATEWAY_URL)
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const response = await requester
            .delete(`/api/v1/collection/by-user/${USERS.USER.id}`)
            .set('Authorization', 'Bearer abcd')
            .send();

        response.status.should.equal(200);
        response.body.data.should.be.an('array').with.lengthOf(0);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Collection.deleteMany({}).exec();
    });
});
