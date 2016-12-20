'use strict';

const logger = require('logger');
const config = require('config');
const VocabularyNotValid = require('errors/vocabularyNotValid');

class VocabularyValidator{

    static * validate(koaObj){
        return true; // @TODO
    }

}

module.exports = VocabularyValidator;
