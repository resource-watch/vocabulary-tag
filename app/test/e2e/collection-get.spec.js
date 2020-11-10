const nock = require('nock');
const chai = require('chai');
const Collection = require('models/collection.model');
const { USERS } = require('./utils/test.constants');
const { createCollection } = require('./utils/helpers');

const { getTestServer } = require('./utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Get collections', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Collection.deleteMany({}).exec();
    });

    it('Get collections without being authenticated should return a 401 `Unauthorized`', async () => {
        const response = await requester
            .get(`/api/v1/collection`)
            .send();

        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Unauthorized`);
    });

    it('Get collections with a user id should return a 200 with an empty list (happy case, no data)', async () => {
        const response = await requester
            .get(`/api/v1/collection`)
            .query({ loggedUser: JSON.stringify(USERS.USER) })
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Get collections with a user id should return a 200 with collections from the user and default app (happy case)', async () => {
        const collectionOne = await new Collection(createCollection({
            application: 'rw',
            ownerId: USERS.USER.id
        })).save();
        const collectionTwo = await new Collection(createCollection({
            application: 'rw',
            ownerId: USERS.USER.id
        })).save();

        const response = await requester
            .get(`/api/v1/collection`)
            .query({ loggedUser: JSON.stringify(USERS.USER) })
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);
        response.body.data.map((collection) => collection.id).should.have.members([collectionOne._id.toString(), collectionTwo._id.toString()]);
    });

    it('Get collections with a user id and no explicit app should return a 200 with collections from the user and default app (happy case)', async () => {
        await new Collection(createCollection({ application: 'gfw', ownerId: USERS.USER.id })).save();
        const collectionTwo = await new Collection(createCollection({
            application: 'rw',
            ownerId: USERS.USER.id
        })).save();

        const response = await requester
            .get(`/api/v1/collection`)
            .query({ loggedUser: JSON.stringify(USERS.USER) })
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);
        response.body.data.map((collection) => collection.id).should.have.members([collectionTwo._id.toString()]);
    });

    it('Get collections with a user id and an explicit app should return a 200 with collections from the user and provided app', async () => {
        const collectionOne = await new Collection(createCollection({
            application: 'gfw',
            ownerId: USERS.USER.id
        })).save();
        await new Collection(createCollection({
            application: 'rw',
            ownerId: USERS.USER.id
        })).save();

        const response = await requester
            .get(`/api/v1/collection`)
            .query({ loggedUser: JSON.stringify(USERS.USER), application: 'gfw' })
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);
        response.body.data.map((collection) => collection.id).should.have.members([collectionOne._id.toString()]);
    });

    it('Get collections with include should return a 200 with collections from the user and provided app (no resources associated with collection)', async () => {
        await new Collection(createCollection({
            application: 'gfw',
            ownerId: USERS.USER.id
        })).save();
        const collection = await new Collection(createCollection({
            application: 'rw',
            ownerId: USERS.USER.id
        })).save();

        const response = await requester
            .get(`/api/v1/collection`)
            .query({ loggedUser: JSON.stringify(USERS.USER), include: true })
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);
        response.body.data.map((responseCollection) => responseCollection.id).should.have.members([collection._id.toString()]);
    });

    it('Get collections with include should return a 200 with collections from the user and provided app and the associated resources', async () => {
        const collection = await new Collection(createCollection({
            application: 'rw',
            ownerId: USERS.USER.id,
            resources: [{
                id: 'widgetId',
                type: 'widget'
            }, {
                id: 'layerId',
                type: 'layer'
            }, {
                id: 'datasetId',
                type: 'dataset'
            }]
        })).save();

        nock(process.env.CT_URL)
            .get('/v1/dataset?ids=datasetId')
            .reply(200, {
                data: [
                    {
                        id: 'datasetId',
                        type: 'dataset',
                        attributes: 'datasetAttributes'
                    }
                ],
                links: {
                    self: 'http://api.resourcewatch.org/v1/dataset?page[number]=1&page[size]=10',
                    first: 'http://api.resourcewatch.org/v1/dataset?page[number]=1&page[size]=10',
                    last: 'http://api.resourcewatch.org/v1/dataset?page[number]=1&page[size]=10',
                    prev: 'http://api.resourcewatch.org/v1/dataset?page[number]=1&page[size]=10',
                    next: 'http://api.resourcewatch.org/v1/dataset?page[number]=1&page[size]=10'
                },
                meta: {
                    'total-pages': 1,
                    'total-items': 1,
                    size: 10
                }
            });

        nock(process.env.CT_URL)
            .get('/v1/widget?ids=widgetId')
            .reply(200, {
                data: [
                    {
                        id: 'widgetId',
                        type: 'widget',
                        attributes: 'widgetAttributes'
                    }
                ],
                links: {
                    self: 'http://api.resourcewatch.org/v1/widget/?page[number]=1&page[size]=10',
                    first: 'http://api.resourcewatch.org/v1/widget/?page[number]=1&page[size]=10',
                    last: 'http://api.resourcewatch.org/v1/widget/?page[number]=1&page[size]=10',
                    prev: 'http://api.resourcewatch.org/v1/widget/?page[number]=1&page[size]=10',
                    next: 'http://api.resourcewatch.org/v1/widget/?page[number]=1&page[size]=10'
                },
                meta: {
                    'total-pages': 1,
                    'total-items': 1,
                    size: 10
                }
            });

        nock(process.env.CT_URL)
            .get('/v1/layer/layerId')
            .reply(200, {
                data: {
                    id: 'layerId',
                    type: 'layer',
                    attributes: 'layerAttributes'
                }
            });

        const response = await requester
            .get(`/api/v1/collection`)
            .query({ loggedUser: JSON.stringify(USERS.USER), include: true })
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);
        response.body.data[0].should.deep.equal({
            id: collection._id.toString(),
            type: 'collection',
            attributes: {
                name: collection.name,
                ownerId: USERS.USER.id,
                application: 'rw',
                resources: [
                    {
                        id: 'widgetId',
                        type: 'widget',
                        attributes: 'widgetAttributes'
                    },
                    {
                        id: 'layerId',
                        type: 'layer',
                        attributes: 'layerAttributes'
                    },
                    {
                        id: 'datasetId',
                        type: 'dataset',
                        attributes: 'datasetAttributes'
                    }
                ]
            }
        });
    });

    it('Get collections without pagination arguments should return the full list of collections', async () => {
        for (let i = 0; i < 20; i++) {
            await new Collection(createCollection({
                application: 'rw',
                ownerId: USERS.USER.id
            })).save();
        }

        const response = await requester
            .get(`/api/v1/collection`)
            .query({ loggedUser: JSON.stringify(USERS.USER) })
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(20);
        response.body.should.have.property('links').and.be.an('object');
    });

    it('Get collections with pagination arguments should return the paginated list of collections', async () => {
        for (let i = 0; i < 20; i++) {
            await new Collection(createCollection({
                application: 'rw',
                ownerId: USERS.USER.id
            })).save();
        }

        const response = await requester
            .get(`/api/v1/collection`)
            .query({
                loggedUser: JSON.stringify(USERS.USER),
                page: {
                    number: 1, size: 3
                }
            })
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(3);
        response.body.should.have.property('links').and.be.an('object');
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Collection.deleteMany({}).exec();
    });
});
