const gulp = require('gulp');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json');
var clean = require('gulp-clean');

const paths = {
  pages: ['src/*.html']
};
const jsDest = './build/lib';
const dest = './build';
gulp.task('clean', function () {
  return gulp.src(dest, { force: true })
    .pipe(clean());
});

gulp.task('copy-html', function () {
  return gulp.src(paths.pages)
    .pipe(gulp.dest(dest));
});

gulp.task('scripts', function () {
  return tsProject.src()
    .pipe(tsProject())
    .pipe(gulp.dest(jsDest));
});

gulp.task('watch', function () {
  gulp.watch('src/lib/*.ts', gulp.series('scripts'));
  gulp.watch('src/index.html', gulp.series('copy-html'));
});

gulp.task('default', gulp.series('clean', 'copy-html', 'scripts', 'watch'));
