var gulp = require('gulp')
var babel = require('gulp-babel')
var sourcemaps = require('gulp-sourcemaps')
var plumber = require('gulp-plumber')
var uglify = require('gulp-uglify')

gulp.task('libs-dev', function () {
  return gulp.src("./src/libs/*.js")
    .pipe(babel())
    // .pipe(uglify().on('error', console.log))
    .pipe(gulp.dest("./libs"))
})

gulp.task('libs-prod', function () {
  return gulp.src("./src/libs/*.js")
    .pipe(sourcemaps.init())
    .pipe(plumber())
    .pipe(babel())
    .pipe(uglify().on('error', console.log))
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest("./libs"))
})

gulp.task('prep-dev', ['libs-dev'], function() {})
gulp.task('prep-prod', ['libs-prod'], function() {})
