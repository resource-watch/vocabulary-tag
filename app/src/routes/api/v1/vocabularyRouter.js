'use strict';

var Router = require('koa-router');
var logger = require('logger');
var config = require('config');

const USER_ROLES = require('appConstants').USER_ROLES;

var router = new Router();

class VocabularyRouter {

    static * get(){
        this.body = true;
    }

    static * create(){
        this.body = true;
    }

    static * update(){
        this.body = true;
    }

    static * delete(){
        this.body = true;
    }

    static * getAll(){
        this.body = true;
    }

    static * getById(){
        this.body = true;
    }

    static * getByIds(){
        this.body = true;
    }

}

// Negative checking
const authorizationMiddleware = function*(next) {
    // // Check delete
    // if(this.request.method === 'DELETE' && (!this.request.query.language || !this.request.query.application)){
    //     this.throw(400, 'Bad request');
    //     return;
    // }
    // // Get user from query (delete) or body (post-patch)
    // let user = Object.assign({}, this.request.query.loggedUser? JSON.parse(this.request.query.loggedUser): {}, this.request.body.loggedUser);
    // if(!user || USER_ROLES.indexOf(user.role) === -1){
    //     this.throw(401, 'Unauthorized'); //if not logged or invalid ROLE-> out
    //     return;
    // }
    // if(user.role === 'USER'){
    //     this.throw(403, 'Forbidden'); // if USER -> out
    //     return;
    // }
    // // Get application from query (delete) or body (post-patch)
    // let application = this.request.query.application? this.request.query.application: this.request.body.application;
    // if(user.role === 'MANAGER' || user.role === 'ADMIN'){
    //     if(user.extraUserData.apps.indexOf(application) === -1){
    //         this.throw(403, 'Forbidden'); // if manager or admin but no application -> out
    //         return;
    //     }
    //     if(user.role === 'MANAGER' && this.request.method !== 'POST'){ // extra check if a MANAGER wants to update or delete
    //         let resource = MetadataRouter.getResource(this.params);
    //         let permission = yield MetadataService.hasPermission(user, this.params.dataset, resource, this.request.body);
    //         if(!permission){
    //             this.throw(403, 'Forbidden');
    //             return;
    //         }
    //     }
    // }
    yield next; // SUPERADMIN is included here
};

// Validator Wrapper
const validationMiddleware = function*(next){
    // if(!this.request.body || !this.request.body.application || !this.request.body.language){
    //     this.throw(400, 'Bad request');
    //     return;
    // }
    // try{
    //     yield MetadataValidator.validate(this);
    // } catch(err) {
    //     if(err instanceof MetadataNotValid){
    //         this.throw(400, err.getMessages());
    //         return;
    //     }
    //     throw err;
    // }
    yield next;
};


// dataset
router.get('/dataset/:dataset/vocabulary', VocabularyRouter.get); //get ALL vocabularies (name and terms) for that dataset -> Go To Resource Model
router.get('/dataset/:dataset/vocabulary/:vocabulary', VocabularyRouter.get); //get the desired vocabulary for that dataset -> Go To Resource Model
router.get('/dataset/vocabulary', VocabularyRouter.get); //get resources of that vocabulary and vocabulary terms (it's a query) -> Go To Vocabulary Model (very important) for that reason
// we have modeled and created 2 different schemas
router.post('/dataset/:dataset/vocabulary/:vocabulary', authorizationMiddleware, validationMiddleware, VocabularyRouter.create); // Crete association
router.patch('/dataset/:dataset/vocabulary/:vocabulary', authorizationMiddleware, validationMiddleware, VocabularyRouter.update); // Modify terms of that association
router.delete('/dataset/:dataset/vocabulary/:vocabulary', authorizationMiddleware, VocabularyRouter.delete); // Delete association
// // widget SAME WITH WIDGETS AND LAYERS
// router.get('/dataset/:dataset/widget/:widget/vocabulary', VocabularyRouter.get);
// router.post('/dataset/:dataset/widget/:widget/vocabulary', authorizationMiddleware, validationMiddleware, VocabularyRouter.create);
// router.patch('/dataset/:dataset/widget/:widget/vocabulary', authorizationMiddleware, validationMiddleware, VocabularyRouter.update);
// router.delete('/dataset/:dataset/widget/:widget/vocabulary', authorizationMiddleware, VocabularyRouter.delete);
// // layer
// router.get('/dataset/:dataset/layer/:layer/vocabulary', VocabularyRouter.get);
// router.post('/dataset/:dataset/layer/:layer/vocabulary', authorizationMiddleware, validationMiddleware, VocabularyRouter.create);
// router.patch('/dataset/:dataset/layer/:layer/vocabulary', authorizationMiddleware, validationMiddleware, VocabularyRouter.update);
// router.delete('/dataset/:dataset/layer/:layer/vocabulary', authorizationMiddleware, VocabularyRouter.delete);
// generic
router.get('/vocabulary', VocabularyRouter.getAll); // Get all vocabularies
router.get('/vocabulary/:vocabulary', VocabularyRouter.getById); // Get a particular vocabulary
// get by ids (For includes queries)
router.post('/dataset/vocabulary/get-by-ids', VocabularyRouter.getByIds); //get vocabularies from ids -> go to Resource Model
router.post('/dataset/:dataset/widget/vocabulary/get-by-ids', VocabularyRouter.getByIds);
router.post('/dataset/:dataset/layer/vocabulary/get-by-ids', VocabularyRouter.getByIds);

module.exports = router;
