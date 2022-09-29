const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const {
    mockGetUserFromToken, createVocabulary, ensureCorrectError
} = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Delete widgets by user id endpoint', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    beforeEach(async () => {
        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });

    it('Deleting all vocabularies of an user without being authenticated should return a 401 "Not authorized" error', async () => {
        const response = await requester.delete(`/api/v1/vocabulary/by-user/${USERS.USER.id}`);
        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Deleting all vocabularies of an user while being authenticated as USER that is not the owner of vocabularies or admin should return a 403 "Forbidden" error', async () => {
        mockGetUserFromToken(USERS.MANAGER);
        await new Vocabulary(createVocabulary({ id: 'abcd', userId: USERS.USER.id })).save();

        const response = await requester
            .delete(`/api/v1/vocabulary/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();

        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Forbidden');
    });

    it('Deleting all vocabularies of an user while being authenticated as ADMIN should return a 200 and all widgets deleted', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const vocabularyOne = await new Vocabulary(createVocabulary({ id: 'abcd', userId: USERS.USER.id })).save();
        const vocabularyTwo = await new Vocabulary(createVocabulary({ id: 'abcd', userId: USERS.USER.id })).save();
        const fakeVocabularyFromAdmin = await new Vocabulary(createVocabulary({ id: 'abcd', userId: USERS.ADMIN.id })).save();
        const fakeVocabularyFromManager = await new Vocabulary(createVocabulary({ id: 'abcd', userId: USERS.MANAGER.id })).save();

        const response = await requester
            .delete(`/api/v1/vocabulary/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();

        response.status.should.equal(200);
        response.body.data[0].id.should.equal(vocabularyOne.id);
        response.body.data[0].attributes.name.should.equal(vocabularyOne.id);
        response.body.data[1].id.should.equal(vocabularyTwo.id);
        response.body.data[1].attributes.name.should.equal(vocabularyTwo.id);

        const findVocabularyByUser = await Vocabulary.find({ userId: { $eq: USERS.USER.id } }).exec();
        findVocabularyByUser.should.be.an('array').with.lengthOf(0);

        const findAllVocabularies = await Vocabulary.find({}).exec();
        findAllVocabularies.should.be.an('array').with.lengthOf(2);

        const vocabularyNames = findAllVocabularies.map((vocabulary) => vocabulary.id);
        vocabularyNames.should.contain(fakeVocabularyFromManager.id);
        vocabularyNames.should.contain(fakeVocabularyFromAdmin.id);
    });

    // it('Deleting all widgets of an user while being authenticated as that user should return a 200 and all widgets deleted', async () => {
    //     mockGetUserFromToken(USERS.USER);
    //     const vocabularyOne = await new Widget(createWidget({ env: 'staging', dataset: '123', userId: USERS.USER.id })).save();
    //     const vocabularyTwo = await new Widget(createWidget({ env: 'production', dataset: '123', userId: USERS.USER.id })).save();
    //     const fakeVocabularyFromAdmin = await new Widget(createWidget({ env: 'production', dataset: '123', userId: USERS.ADMIN.id })).save();
    //     const fakeVocabularyFromManager = await new Widget(createWidget({ env: 'staging', dataset: '123', userId: USERS.MANAGER.id })).save();

    //     const response = await requester
    //         .delete(`/api/v1/widget/by-user/${USERS.USER.id}`)
    //         .set('Authorization', `Bearer abcd`)
    //         .send();

    //     response.status.should.equal(200);
    //     response.body.data[0].id.should.equal(vocabularyOne._id);
    //     response.body.data[0].attributes.name.should.equal(vocabularyOne.name);
    //     response.body.data[0].attributes.userId.should.equal(vocabularyOne.userId);
    //     response.body.data[0].attributes.dataset.should.equal(vocabularyOne.dataset);
    //     response.body.data[1].id.should.equal(vocabularyTwo._id);
    //     response.body.data[1].attributes.name.should.equal(vocabularyTwo.name);
    //     response.body.data[1].attributes.userId.should.equal(vocabularyTwo.userId);
    //     response.body.data[1].attributes.dataset.should.equal(vocabularyTwo.dataset);

    //     const findWidgetByUser = await Widget.find({ userId: { $eq: USERS.USER.id } }).exec();
    //     findWidgetByUser.should.be.an('array').with.lengthOf(0);

    //     const findAllWidgets = await Widget.find({}).exec();
    //     findAllWidgets.should.be.an('array').with.lengthOf(2);

    //     const widgetNames = findAllWidgets.map(widget => widget.name);
    //     widgetNames.should.contain(fakeVocabularyFromManager.name);
    //     widgetNames.should.contain(fakeVocabularyFromAdmin.name);
    // });

    afterEach(async () => {
        await Vocabulary.deleteMany({}).exec();
        await Resource.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(async () => {
        await Vocabulary.deleteMany({}).exec();
        await Resource.deleteMany({}).exec();
    });
});
