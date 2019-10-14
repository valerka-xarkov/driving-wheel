const gulp = require('gulp');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json');
const merge = require('merge2');  // Requires separate installation

const paths = {
  pages: ['src/*.html']
};
const dest = './build';

gulp.task('copy-html', function () {
  return gulp.src(paths.pages)
    .pipe(gulp.dest(dest));
});

gulp.task('scripts', function () {
  const tsResult = tsProject.src()
    .pipe(tsProject());

  return merge([
    tsResult.dts.pipe(gulp.dest(dest)),
    tsResult.js.pipe(gulp.dest(dest))
  ]);
});

gulp.task('watch', function () {
  gulp.watch('src/ts/*.ts', gulp.series('scripts'));
  gulp.watch('src/index.html', gulp.series('copy-html'));
});

gulp.task('default', gulp.parallel('copy-html', 'scripts', 'watch'));
