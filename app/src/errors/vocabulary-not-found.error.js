
class VocabularyNotFound extends Error {

    constructor(message) {
        super(message);
        this.name = 'VocabularyNotFound';
        this.message = message;
    }

}

module.exports = VocabularyNotFound;
