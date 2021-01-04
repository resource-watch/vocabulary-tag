const nock = require('nock');
const chai = require('chai');
const Collection = require('models/collection.model');
const mongoose = require('mongoose');
const { createCollection } = require('../utils/helpers');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const assertValidFindByIdsResponse = (response, expectedResponse) => {
    response.status.should.equal(200);
    response.body.should.have.property('data').and.be.an('array').and.length(expectedResponse.length);
    (response.body.data.sort()).should.deep.equal(expectedResponse.sort());
};

describe('Find collections by IDs', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Collection.deleteMany({}).exec();
    });

    it('Find collections without ids or userId in body returns a 400 error', async () => {
        const response = await requester
            .post(`/api/v1/collection/find-by-ids`)
            .send({});

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`[{"ids":"ids can not be empty."},{"userId":"userId can not be empty."}]`);
    });

    it('Find collections with empty id list returns a 400 error', async () => {
        const response = await requester
            .post(`/api/v1/collection/find-by-ids`)
            .send({
                ids: [],
                userId: mongoose.Types.ObjectId()
            });

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`[{"ids":"'ids' must be a non-empty array or string"}]`);
    });

    it('Find collections with id list containing an invalid collection id that does not exist returns an empty list (empty db)', async () => {
        const response = await requester
            .post(`/api/v1/collection/find-by-ids`)
            .send({
                ids: ['abcd'],
                userId: mongoose.Types.ObjectId()
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Find collections with id list containing a valid id that does not exist returns an empty list (empty db)', async () => {
        const response = await requester
            .post(`/api/v1/collection/find-by-ids`)
            .send({
                ids: [mongoose.Types.ObjectId()],
                userId: mongoose.Types.ObjectId()
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Find collections with matching id list but different user id returns an empty list', async () => {
        const collectionOne = await new Collection(createCollection({ application: 'rw' })).save();
        await new Collection(createCollection({ application: 'gfw' })).save();

        const response = await requester
            .post(`/api/v1/collection/find-by-ids`)
            .send({
                ids: [collectionOne.id],
                userId: mongoose.Types.ObjectId()
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Find collections with id string for a collections that exists and a matching userId returns the collections that match user and id list - single result (happy case)', async () => {
        const collectionOne = await new Collection(createCollection({ application: 'rw' })).save();
        await new Collection(createCollection({ application: 'gfw' })).save();

        const response = await requester
            .post(`/api/v1/collection/find-by-ids`)
            .send({
                ids: collectionOne.id,
                userId: collectionOne.ownerId
            });

        assertValidFindByIdsResponse(response, [{
            id: collectionOne.id,
            type: 'collection',
            attributes: {
                name: collectionOne.name,
                ownerId: collectionOne.ownerId,
                application: 'rw',
                resources: []
            }
        }]);
    });

    it('Find collections with id list containing a collections that exists and a matching userId returns the collections that match user and id list - single result (happy case)', async () => {
        const collectionOne = await new Collection(createCollection({ application: 'rw' })).save();
        await new Collection(createCollection({ application: 'gfw' })).save();

        const response = await requester
            .post(`/api/v1/collection/find-by-ids`)
            .send({
                ids: [collectionOne.id],
                userId: collectionOne.ownerId
            });

        assertValidFindByIdsResponse(response, [{
            id: collectionOne.id,
            type: 'collection',
            attributes: {
                name: collectionOne.name,
                ownerId: collectionOne.ownerId,
                application: 'rw',
                resources: []
            }
        }]);
    });

    it('Find collections with id list containing a collections that exists and a matching userId returns the collections that match user and id list - multiple result (happy case)', async () => {
        const userId = mongoose.Types.ObjectId();

        const collectionOne = await new Collection(createCollection({ application: 'rw', ownerId: userId })).save();
        const collectionTwo = await new Collection(createCollection({ application: 'gfw', ownerId: userId })).save();

        const response = await requester
            .post(`/api/v1/collection/find-by-ids`)
            .send({
                ids: [collectionOne.id, collectionTwo.id],
                userId: collectionOne.ownerId
            });

        assertValidFindByIdsResponse(response, [
            {
                id: collectionOne.id,
                type: 'collection',
                attributes: {
                    name: collectionOne.name,
                    ownerId: collectionOne.ownerId,
                    application: 'rw',
                    resources: []
                }
            },
            {
                id: collectionTwo.id,
                type: 'collection',
                attributes: {
                    name: collectionTwo.name,
                    ownerId: collectionTwo.ownerId,
                    application: 'gfw',
                    resources: []
                }
            }
        ]);
    });

    it('Find collections with id list containing a collections that exists and a matching userId doesn\'t return the collections that don\'t match user id', async () => {
        const userId = mongoose.Types.ObjectId();

        const collectionOne = await new Collection(createCollection({ application: 'rw', ownerId: userId })).save();
        const collectionTwo = await new Collection(createCollection({ application: 'gfw', ownerId: userId })).save();
        const collectionThree = await new Collection(createCollection({
            application: 'gfw',
            ownerId: mongoose.Types.ObjectId()
        })).save();

        const response = await requester
            .post(`/api/v1/collection/find-by-ids`)
            .send({
                ids: [collectionOne.id, collectionTwo.id, collectionThree.id],
                userId: collectionOne.ownerId
            });

        assertValidFindByIdsResponse(response, [
            {
                id: collectionOne.id,
                type: 'collection',
                attributes: {
                    name: collectionOne.name,
                    ownerId: collectionOne.ownerId,
                    application: 'rw',
                    resources: []
                }
            },
            {
                id: collectionTwo.id,
                type: 'collection',
                attributes: {
                    name: collectionTwo.name,
                    ownerId: collectionTwo.ownerId,
                    application: 'gfw',
                    resources: []
                }
            }
        ]);
    });

    it('Find collections with id list containing collections that exist returns the listed collections (query param is ignored)', async () => {
        const collectionOne = await new Collection(createCollection({ application: 'rw' })).save();
        const collectionTwo = await new Collection(createCollection({ application: 'gfw' })).save();

        const response = await requester
            .post(`/api/v1/collection/find-by-ids?ids=${collectionTwo.id}`)
            .send({
                ids: [collectionOne.id],
                userId: collectionOne.ownerId
            });

        assertValidFindByIdsResponse(response, [{
            id: collectionOne.id,
            type: 'collection',
            attributes: {
                name: collectionOne.name,
                ownerId: collectionOne.ownerId,
                application: 'rw',
                resources: []
            }
        }]);
    });

    it('Find collections with id list allows filtering by application using a query parameter, returning the listed collections', async () => {
        const userId = mongoose.Types.ObjectId();

        const collectionOne = await new Collection(createCollection({ application: 'rw', ownerId: userId })).save();
        const collectionTwo = await new Collection(createCollection({ application: 'gfw', ownerId: userId })).save();

        const response = await requester.post(`/api/v1/collection/find-by-ids`).send({
            ids: [collectionOne.id, collectionTwo.id],
            userId,
        });

        assertValidFindByIdsResponse(response, [
            {
                id: collectionOne.id,
                type: 'collection',
                attributes: {
                    name: collectionOne.name,
                    ownerId: collectionOne.ownerId,
                    application: 'rw',
                    resources: []
                }
            },
            {
                id: collectionTwo.id,
                type: 'collection',
                attributes: {
                    name: collectionTwo.name,
                    ownerId: collectionTwo.ownerId,
                    application: 'gfw',
                    resources: []
                }
            }
        ]);

        const response2 = await requester.post(`/api/v1/collection/find-by-ids?application=rw`).send({
            ids: [collectionOne.id, collectionTwo.id],
            userId,
        });

        assertValidFindByIdsResponse(response2, [{
            id: collectionOne.id,
            type: 'collection',
            attributes: {
                name: collectionOne.name,
                ownerId: collectionOne.ownerId,
                application: 'rw',
                resources: []
            }
        }]);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Collection.deleteMany({}).exec();
    });
});
