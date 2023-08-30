const nock = require('nock');
const chai = require('chai');
const Favourite = require('models/favourite.model');
const { USERS } = require('../utils/test.constants');
const {
    createFavourite,
    mockValidateRequestWithApiKeyAndUserToken,
    ensureCorrectError,
    mockDeleteFavouriteResourceFromGraph, mockValidateRequestWithApiKey
} = require('../utils/helpers');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Delete favourites by user id', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Favourite.deleteMany({}).exec();
    });

    it('Deleting favourites by user while not being authenticated should return a 401', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .delete(`/api/v1/favourite/by-user/${USERS.USER.id}`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Deleting favourites by user while not being logged as an ADMIN or as the same user that is being deleted should return a 403', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });

        const response = await requester
            .delete(`/api/v1/favourite/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Forbidden');
    });

    it('Deleting favourites by user as ADMIN should return 200 and all deleted favourites', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        const favouriteOne = await (new Favourite(createFavourite({
            userId: USERS.USER.id,
            application: 'rw',
            resourceType: 'layer'
        }))).save();
        const favouriteTwo = await (new Favourite(createFavourite({
            userId: USERS.USER.id,
            application: 'gfw',
            resourceType: 'widget'
        }))).save();
        const favouriteByManager = await (new Favourite(createFavourite({ userId: USERS.MANAGER.id }))).save();
        const favouriteByAdmin = await (new Favourite(createFavourite({ userId: USERS.ADMIN.id }))).save();
        mockDeleteFavouriteResourceFromGraph(favouriteOne.resourceType, favouriteOne.resourceId, favouriteOne._id);
        mockDeleteFavouriteResourceFromGraph(favouriteTwo.resourceType, favouriteTwo.resourceId, favouriteTwo._id);

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const response = await requester
            .delete(`/api/v1/favourite/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(200);
        response.body.data.map((elem) => elem.id).sort().should.deep.equal([favouriteOne._id.toString(), favouriteTwo.id.toString()].sort());

        const findFavouritesByUser = await Favourite.find({ userId: { $eq: USERS.USER.id } }).exec();
        findFavouritesByUser.should.be.an('array').with.lengthOf(0);

        const findAllFavourites = await Favourite.find({}).exec();
        findAllFavourites.should.be.an('array').with.lengthOf(2);

        const favouriteResourceTypes = findAllFavourites.map((favourite) => favourite.resourceType);
        favouriteResourceTypes.should.contain(favouriteByManager.resourceType);
        favouriteResourceTypes.should.contain(favouriteByAdmin.resourceType);
    });

    it('Deleting favourites by user as a microservice should return 200 and all deleted favourites', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MICROSERVICE });
        const favouriteOne = await (new Favourite(createFavourite({
            userId: USERS.USER.id,
            application: 'rw',
            resourceType: 'layer'
        }))).save();
        const favouriteTwo = await (new Favourite(createFavourite({
            userId: USERS.USER.id,
            application: 'gfw',
            resourceType: 'widget'
        }))).save();
        const favouriteByManager = await (new Favourite(createFavourite({ userId: USERS.MANAGER.id }))).save();
        const favouriteByAdmin = await (new Favourite(createFavourite({ userId: USERS.ADMIN.id }))).save();
        mockDeleteFavouriteResourceFromGraph(favouriteOne.resourceType, favouriteOne.resourceId, favouriteOne._id);
        mockDeleteFavouriteResourceFromGraph(favouriteTwo.resourceType, favouriteTwo.resourceId, favouriteTwo._id);

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const response = await requester
            .delete(`/api/v1/favourite/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(200);
        response.body.data.map((elem) => elem.id).sort().should.deep.equal([favouriteOne._id.toString(), favouriteTwo.id.toString()].sort());

        const findFavouritesByUser = await Favourite.find({ userId: { $eq: USERS.USER.id } }).exec();
        findFavouritesByUser.should.be.an('array').with.lengthOf(0);

        const findAllFavourites = await Favourite.find({}).exec();
        findAllFavourites.should.be.an('array').with.lengthOf(2);

        const favouriteResourceTypes = findAllFavourites.map((favourite) => favourite.resourceType);
        favouriteResourceTypes.should.contain(favouriteByManager.resourceType);
        favouriteResourceTypes.should.contain(favouriteByAdmin.resourceType);
    });

    it('Deleting a favourite owned by a user that does not exist as a MICROSERVICE should return a 404', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MICROSERVICE });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
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
            .delete(`/api/v1/favourite/by-user/potato`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        deleteResponse.status.should.equal(404);
        deleteResponse.body.should.have.property('errors').and.be.an('array');
        deleteResponse.body.errors[0].should.have.property('detail').and.equal(`User potato does not exist`);
    });

    it('Deleting favourites by user as the user themselves should return 200 and all deleted favourites', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const favouriteOne = await (new Favourite(createFavourite({
            userId: USERS.USER.id,
            application: 'rw',
            resourceType: 'layer'
        }))).save();
        const favouriteTwo = await (new Favourite(createFavourite({
            userId: USERS.USER.id,
            application: 'gfw',
            resourceType: 'widget'
        }))).save();
        const favouriteByManager = await (new Favourite(createFavourite({ userId: USERS.MANAGER.id }))).save();
        const favouriteByAdmin = await (new Favourite(createFavourite({ userId: USERS.ADMIN.id }))).save();
        mockDeleteFavouriteResourceFromGraph(favouriteOne.resourceType, favouriteOne.resourceId, favouriteOne._id);
        mockDeleteFavouriteResourceFromGraph(favouriteTwo.resourceType, favouriteTwo.resourceId, favouriteTwo._id);

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const response = await requester
            .delete(`/api/v1/favourite/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(200);
        response.body.data.map((elem) => elem.id).sort().should.deep.equal([favouriteOne._id.toString(), favouriteTwo.id.toString()].sort());

        const findFavouritesByUser = await Favourite.find({ userId: { $eq: USERS.USER.id } }).exec();
        findFavouritesByUser.should.be.an('array').with.lengthOf(0);

        const findAllFavourites = await Favourite.find({}).exec();
        findAllFavourites.should.be.an('array').with.lengthOf(2);

        const favouriteResourceTypes = findAllFavourites.map((favourite) => favourite.resourceType);
        favouriteResourceTypes.should.contain(favouriteByManager.resourceType);
        favouriteResourceTypes.should.contain(favouriteByAdmin.resourceType);
    });

    it('Deleting favourites from a user should delete them completely from a database (large number of favourites)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        await Promise.all([...Array(50)].map(async () => {
            await new Favourite(createFavourite({
                application: 'rw', userId: USERS.USER.id, resourceType: 'layer'
            })).save();
            await new Favourite(createFavourite({
                application: 'gfw', userId: USERS.USER.id, resourceType: 'widget'
            })).save();
        }));

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const deleteResponse = await requester
            .delete(`/api/v1/favourite/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        deleteResponse.status.should.equal(200);
        deleteResponse.body.should.have.property('data').with.lengthOf(100);

        const findFAvouriteByUser = await Favourite.find({ userId: { $eq: USERS.USER.id } }).exec();
        findFAvouriteByUser.should.be.an('array').with.lengthOf(0);
    });

    it('Deleting all favourites of an user while being authenticated as USER should return a 200 and all favourites deleted - no favourites in the db', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const response = await requester
            .delete(`/api/v1/favourite/by-user/${USERS.USER.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(200);
        response.body.data.should.be.an('array').with.lengthOf(0);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Favourite.deleteMany({}).exec();
    });
});
