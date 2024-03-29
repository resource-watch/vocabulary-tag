const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const { createResource, getUUID, mockValidateRequestWithApiKey } = require('../utils/helpers');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let resourceOne;
let resourceTwo;

describe('Find widget vocabularies by IDs', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany({}).exec();
    });

    it('Find vocabularies without ids in body returns a 400 error', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .post(`/api/v1/dataset/345/widget/vocabulary/find-by-ids`)
            .set('x-api-key', 'api-key-test')
            .send({});


        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Bad request - Missing 'ids' from request body`);
    });

    it('Find vocabularies with empty id list returns an empty list (empty db)', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .post(`/api/v1/dataset/345/widget/vocabulary/find-by-ids`)
            .set('x-api-key', 'api-key-test')
            .send({
                ids: []
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Find vocabularies with id list containing vocabulary that does not exist returns an empty list (empty db)', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .post(`/api/v1/dataset/345/widget/vocabulary/find-by-ids`)
            .set('x-api-key', 'api-key-test')
            .send({
                ids: ['abcd']
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Find vocabularies with id list containing a vocabulary that exists returns only the listed vocabulary', async () => {
        mockValidateRequestWithApiKey({});
        resourceOne = await new Resource(createResource('rw', 3, 'widget', getUUID())).save();
        resourceTwo = await new Resource(createResource('gfw', 4, 'widget', getUUID())).save();

        const response = await requester
            .post(`/api/v1/dataset/${resourceOne.dataset}/widget/vocabulary/find-by-ids`)
            .set('x-api-key', 'api-key-test')
            .send({
                ids: [resourceOne.id]
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(3);

        const expectedResponses = [];

        resourceOne.vocabularies.forEach((elem) => {
            expectedResponses.push(
                {
                    type: 'vocabulary',
                    attributes: {
                        resource: {
                            id: resourceOne.id,
                            type: 'dataset'
                        },
                        tags: elem.tags,
                        name: elem.id,
                        application: 'rw'
                    }
                }
            );
        });
    });

    it('Find vocabularies with id list containing vocabularies that exist returns the listed vocabularies', async () => {
        mockValidateRequestWithApiKey({});
        resourceOne = await new Resource(createResource('rw', 3, 'widget', getUUID())).save();
        resourceTwo = await new Resource(createResource('gfw', 4, 'widget', getUUID())).save();

        const response = await requester
            .post(`/api/v1/dataset/${resourceOne.dataset}/widget/vocabulary/find-by-ids`)
            .set('x-api-key', 'api-key-test')
            .send({
                ids: [resourceOne.id, resourceTwo.id]
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(7);

        const expectedResponses = [];

        resourceOne.vocabularies.forEach((elem) => {
            expectedResponses.push(
                {
                    type: 'vocabulary',
                    attributes: {
                        resource: {
                            id: resourceOne.id,
                            type: 'widget'
                        },
                        tags: elem.tags,
                        name: elem.id,
                        application: 'rw'
                    }
                }
            );
        });

        resourceTwo.vocabularies.forEach((elem) => {
            expectedResponses.push(
                {
                    type: 'vocabulary',
                    attributes: {
                        resource: {
                            id: resourceTwo.id,
                            type: 'widget'
                        },
                        tags: elem.tags,
                        name: elem.id,
                        application: elem.application
                    }
                }
            );
        });

        (response.body.data.sort()).should.deep.equal(expectedResponses.sort());
    });

    it('Find vocabularies with id list containing vocabularies that exist returns the listed vocabularies (query param is ignored)', async () => {
        mockValidateRequestWithApiKey({});
        resourceOne = await new Resource(createResource('rw', 3, 'widget', getUUID())).save();
        resourceTwo = await new Resource(createResource('gfw', 4, 'widget', getUUID())).save();

        const response = await requester
            .post(`/api/v1/dataset/${resourceOne.dataset}/widget/vocabulary/find-by-ids?ids=${resourceTwo.id}`)
            .set('x-api-key', 'api-key-test')
            .send({
                ids: [resourceOne.id]
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(3);

        const expectedResponses = [];

        resourceOne.vocabularies.forEach((elem) => {
            expectedResponses.push(
                {
                    type: 'vocabulary',
                    attributes: {
                        resource: {
                            id: resourceOne.id,
                            type: 'widget'
                        },
                        tags: elem.tags,
                        name: elem.id,
                        application: 'rw'
                    }
                }
            );
        });

        (response.body.data.sort()).should.deep.equal(expectedResponses.sort());
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany({}).exec();
    });
});
