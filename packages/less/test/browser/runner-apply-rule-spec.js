describe('less.js apply rule tests', function() {
    beforeEach(function() {
        less.env = 'development';
        less.async = false;
        less.fileAsync = false;
    });

    testLessEqualsInDocument('apply-rule/apply-rule.less', 'apply-rule/apply-rule.css', 'should apply mixin using @apply');
});
