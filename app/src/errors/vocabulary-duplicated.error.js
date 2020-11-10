class VocabularyDuplicated extends Error {

    constructor(message) {
        super(message);
        this.name = 'VocabularyDuplicated';
        this.message = message;
    }

}

module.exports = VocabularyDuplicated;
