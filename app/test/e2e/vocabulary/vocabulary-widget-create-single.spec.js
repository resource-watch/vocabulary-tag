const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { USERS } = require('../utils/test.constants');
const {
    assertOKResponse,
    assertUnauthorizedResponse,
    assertForbiddenResponse,
    mockWidget,
    mockGetUserFromToken
} = require('../utils/helpers');
const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Create a single vocabulary for a widget', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });

    it('Creating a vocabulary-widget relationship without auth returns 401 Unauthorized', async () => {
        assertUnauthorizedResponse(await requester
            .post(`/api/v1/dataset/345/widget/123/vocabulary/science`)
            .send({ application: 'rw', tags: ['biology', 'chemistry'] }));
    });

    it('Creating a vocabulary-widget relationship while being authenticated as a USER should return a 403 Forbidden', async () => {
        mockGetUserFromToken(USERS.USER);
        assertForbiddenResponse(await requester
            .post(`/api/v1/dataset/345/widget/123/vocabulary/science`)
            .set('Authorization', `Bearer abcd`)
            .send({ application: 'rw', tags: ['biology', 'chemistry'] }));
    });

    it('Creating a vocabulary-widget relationship while being authenticated as a MANAGER that does not own the resource should return a 403 Forbidden', async () => {
        mockGetUserFromToken(USERS.MANAGER);
        const mockWidgetId = mockWidget().id;

        const vocabName = 'science';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        assertForbiddenResponse(await requester
            .post(`/api/v1/dataset/345/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .send(vocabData));
    });

    it('Creating a vocabulary-widget relationship while being authenticated as a MANAGER that owns the resource should return a 200', async () => {
        mockGetUserFromToken(USERS.MANAGER);
        const mockWidgetId = mockWidget(null, { userId: USERS.MANAGER.id }).id;

        const vocabName = 'science';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        const response = await requester
            .post(`/api/v1/dataset/345/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .send(vocabData);

        assertOKResponse(response);
        response.body.data[0].should.have.property('id').and.equal(vocabName);
    });

    it('Creating a vocabulary-widget relationship while being authenticated as a MANAGER that owns the resource but does not belong to the same application as the resource should return a 403 Forbidden', async () => {
        mockGetUserFromToken(USERS.MANAGER);
        const mockWidgetId = mockWidget(null, { userId: USERS.MANAGER.id, application: ['fake'] }).id;

        const vocabName = 'science';
        const vocabData = { application: 'fake', tags: ['biology', 'chemistry'] };

        const response = await requester
            .post(`/api/v1/dataset/345/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .send(vocabData);

        assertForbiddenResponse(response);
    });

    it('Creating a vocabulary-widget relationship for a different app while being authenticated as a MANAGER that owns the resource should return a 200', async () => {
        mockGetUserFromToken(USERS.MANAGER);
        const mockWidgetId = mockWidget(null, { userId: USERS.MANAGER.id }).id;

        const vocabName = 'science';
        const vocabData = { application: 'fake', tags: ['biology', 'chemistry'] };

        const response = await requester
            .post(`/api/v1/dataset/345/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .send(vocabData);

        assertOKResponse(response);
        response.body.data[0].should.have.property('id').and.equal(vocabName);
    });

    it('Creating a vocabulary-widget relationship while being authenticated as an ADMIN should return 200 OK and created data', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        // Mock the request for widget validation
        const mockWidgetId = mockWidget().id;

        // Prepare vocabulary test data
        const vocabName = 'science';
        const vocabData = { application: 'rw', tags: ['biology', 'chemistry'] };

        // Perform POST request for creating the vocabulary-widget relationship
        const response = await requester
            .post(`/api/v1/dataset/345/widget/${mockWidgetId}/vocabulary/${vocabName}`)
            .set('Authorization', `Bearer abcd`)
            .send(vocabData);

        assertOKResponse(response);
        response.body.data[0].should.have.property('id').and.equal(vocabName);
    });

    it('Creating multiple vocabulary-widget relationships with auth returns 200 OK and created data', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        // Mock the request for widget validation
        const mockWidgetId = mockWidget().id;

        // Perform POST request for creating multiple vocabulary-widget relationships
        const response = await requester
            .post(`/api/v1/dataset/345/widget/${mockWidgetId}/vocabulary`)
            .set('Authorization', `Bearer abcd`)
            .send({
                physics: { application: 'gfw', tags: ['quantum', 'universe'] },
                geography: { application: 'rw', tags: ['countries', 'cities'] },
            });

        assertOKResponse(response);
        response.body.data[0].attributes.should.have.property('name').and.equal('physics');
        response.body.data[0].attributes.should.have.property('application').and.equal('gfw');
        response.body.data[0].attributes.should.have.property('tags').and.deep.equal(['quantum', 'universe']);
        response.body.data[1].attributes.should.have.property('name').and.equal('geography');
        response.body.data[1].attributes.should.have.property('application').and.equal('rw');
        response.body.data[1].attributes.should.have.property('tags').and.deep.equal(['countries', 'cities']);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });
});
