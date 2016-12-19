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
        return true;
    }

    static * update(){
        return true;
    }

    static * delete(){
        return true;
    }

}

// Negative checking
const authorizationMiddleware = function*(next) {
    yield next;
};

// Validator Wrapper
const validationMiddleware = function*(next){
    yield next;
};

// dataset
router.get('/vocabulary', VocabularyRouter.get);
router.post('/vocabulary', authorizationMiddleware, validationMiddleware, VocabularyRouter.create);
router.patch('/vocabulary', authorizationMiddleware, validationMiddleware, VocabularyRouter.update);
router.delete('/vocabulary', authorizationMiddleware, VocabularyRouter.delete);

module.exports = router;
