// general
var gulp = require('gulp');
var gutil = require('gulp-util');
var plumber = require('gulp-plumber');
var clean = require('gulp-clean');
var runSequence = require('run-sequence');
var concat = require('gulp-concat');
var path = require('path');
var replace = require('gulp-replace');


// 產生sprite與對應的css
gulp.task('sprite-gen', function() {
  var spritesmith = require('gulp.spritesmith');
  return gulp.src('src/img/sprite/*.png')
            .pipe(plumber())
            .pipe(spritesmith({
              imgName: 'sprite.png',
              cssName: 'sprite.css',
              retinaSrcFilter: ['src/img/sprite/*@2x.png'],
              retinaImgName: 'sprite@2x.png'
            }))
            .pipe(gulp.dest('src/spriteTmp'))
            .on('error', gutil.log);
});

// sprite檔名加上hash
gulp.task('sprite-cachebust', ['sprite-gen'], function() {

  var gulpFilter = require('gulp-filter');
  var CacheBuster = require('gulp-cachebust');
  var cachebust = new CacheBuster();

  // 將新的sprite檔案加上hash
  return gulp.src(['src/spriteTmp/sprite.png', 'src/spriteTmp/sprite@2x.png'])
            .pipe(plumber())
            .pipe(cachebust.resources())
            .pipe(gulp.dest('src/spriteTmp')).on('end', function() {
            })
            .on('error', gutil.log);
});

gulp.task('sprite-clean-origin-sprite', ['sprite-cachebust'], function() {
   // 刪除sprite.png
  return gulp.src(['src/spriteTmp/sprite.png', 'src/spriteTmp/sprite@2x.png'])
            .pipe(plumber())
            .pipe(clean({
              force: true
            }))
            .on('error', gutil.log);
})

// 將css引用sprite位置修改
gulp.task('sprite-replacePath', ['sprite-clean-origin-sprite'], function() {

  var tap = require('gulp-tap');
  var gulpFilter = require('gulp-filter');
  var foreach = require('gulp-foreach');

  return gulp.src('src/spriteTmp/*.png') 
    .pipe(foreach(function(stream, file) {

      var pathMatch = file.path.match(/(sprite(@2x)?\.(.*)+\.png)$/);
      var hash = pathMatch[3]

      if (!pathMatch[2]) {
        var regex = new RegExp('sprite\.' + hash +'\.png');
        var regexClean = /sprite\..*\.png$/
        var prefix = '../img/sprite.';
        var replaceStr = 'sprite.png';
      } else {
        var regex = new RegExp('sprite@2x\.' + hash +'\.png');
        var regexClean = /sprite@2x\..*\.png$/
        var prefix = '../img/sprite@2x.';
        var replaceStr = 'sprite@2x.png';
      }

      // 將css引用的路徑加上hash
      gulp.src('src/spriteTmp/sprite.css')
        .pipe(plumber())
        .pipe(replace(replaceStr, prefix + hash + '.png'))
        .pipe(gulp.dest('src/spriteTmp'))
        .on('error', gutil.log);

      // 如果名稱不同，清除舊的sprite
      return gulp.src('src/img/*.png')
        .pipe(plumber())
        .pipe(gulpFilter(function(file) {
          return regexClean.test(file.path) && !regex.test(file.path);
        }))
        .pipe(clean({
          force: true
        }))
        .on('error', gutil.log);
    }))
    //.pipe(gulp.dest('src/img'))
    .on('error', gutil.log);
}); 

gulp.task('sprite-movefile', ['sprite-replacePath'], function() {

  var rename = require("gulp-rename");

  gulp.src('src/spriteTmp/sprite.css')
          .pipe(plumber())
          .pipe(rename(function(path) {
            path.basename = '_sprite';
          }))
          .pipe(gulp.dest('src/postcss'))
          .on('error', gutil.log);

  return gulp.src('src/spriteTmp/*.png')
      .pipe(plumber())
      .pipe(gulp.dest('src/img'))
      .on('error', gutil.log);

});

// 清除sprite temp資料夾
gulp.task('sprite-cleanTmp', ['sprite-movefile'], function() {
  return gulp.src('src/spriteTmp').pipe(clean({
    force: true
  }));
});

// 不一定要使用，webpack可設定將圖片轉為base64 encode
gulp.task('sprite-watch', function() {
  gulp.watch(['src/img/sprite/*.png'], ['sprite-cleanTmp']);
});

gulp.task('sprite', function(cb) {
  runSequence('sprite-watch', 'sprite-cleanTmp');
});

gulp.task('postcss-watch', function () {
    var postcss = require('gulp-postcss');
    var sourcemaps = require('gulp-sourcemaps');
    var rename = require("gulp-rename");
    var gulpFilter = require('gulp-filter');

    // postcss plugin
    var autoprefixer = require('autoprefixer'); 
    var precss = require('precss'); // like sass, have nested, mixin, extend
    var lost = require('lost'); // grid system
    var assets  = require('postcss-assets'); // image-size, inline file
    var at2x = require('postcss-at2x');
    var url = require("postcss-url")
 
    return gulp.watch('src/postcss/**/*.css', function(e) {
      gulp.src('src/postcss/**/*.css')
          .pipe(plumber())
          .pipe(gulpFilter(function(file) {
            return !/_.*\.css$/.test(file.path);
          }))
          .pipe(postcss([
            autoprefixer({ browsers: [
              '> 2%',
              'last 2 versions',
              'ie >= 10'
            ]}), 
            precss,
            lost(),
            assets({
              basePath: 'src',
              relativeTo: 'src/css',
              loadPaths: ['img/']
            }),
            at2x({
              identifier: '@2x'
            })
          ]))
          .pipe(gulp.dest('src/css'));
    });
});

gulp.task('postcss', ['sprite', 'postcss-watch']);
