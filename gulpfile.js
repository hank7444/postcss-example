// general
var gulp = require('gulp');
var gutil = require('gulp-util');
var plumber = require('gulp-plumber');
var clean = require('gulp-clean');
var runSequence = require('run-sequence');
var concat = require('gulp-concat');
var path = require('path');
var replace = require('gulp-replace');

// ejs
var ejs = require('gulp-ejs');

// svg
var svgSprite = require('gulp-svg-sprite');

// images
var imagemin = require('gulp-imagemin');
var imageminPngcrush = require('imagemin-pngcrush');

var absolutePath = path.resolve(__dirname);

// path
var rootPath = 'design';
var destPath = 'src/style';
var staticPath = 'static';
var filefolder = {
  'img': {
    'all': [rootPath + '/img/**/*'],
    'compress': [
      rootPath + '/img/**/*.png',
      rootPath + '/img/**/*.jpg',
      rootPath + '/img/**/*.gif',
      rootPath + '/img/**/*.svg',
      '!' + rootPath + '/img/png-sprite/**/*',
      '!' + rootPath + '/img/png-sprite-2x/**/*',
      '!' + rootPath + '/img/svg-sprite/**/*'
    ],
    'svg': {
      'sprite': rootPath + '/img/svg-sprite/**/*.svg',
      'temp': rootPath + '/svgSpriteTemp/'
    },
    'move': [
      rootPath + '/img/**/*.svg',
      rootPath + '/img/**/*.ico',
      '!' + rootPath + '/img/svg-sprite'
    ]
  },
  'ejs': {
    'all': [rootPath + '/ejs/**/*.ejs'],
    'removeHtmlEjs': rootPath + '/html/**/*.ejs'
  },
  'html': {
    'all': [rootPath + '/html/**/*.html'],
    'dest': rootPath + '/html'
  },
  'css': {
    'all': [rootPath + '/css/**/*.css'],
    'move': [
      rootPath + '/css/leading.css'
    ],
    'bundle': [
      rootPath + '/css/global/normalize.css',
      rootPath + '/css/main.css'
    ]
  },
  'sass': rootPath + '/sass/**/*.{sass, scss}'
};

// file state
var watchStatus = {
    'isAdded': function(file) {
        return file.event === 'added';
    },
    'isChanged': function(file) {
        return file.event == 'changed';
    },
    'isDeleted': function(file) {
        return file.event == 'deleted';
    },
    'isNotDeleted': function(file) {
        return file.event != 'deleted';
    }
};


// 產生sprite與對應的css
gulp.task('sprite-gen', function() {
  var spritesmith = require('gulp.spritesmith');
  return gulp.src('src/img/sprite/*.png')
            .pipe(plumber())
            .pipe(spritesmith({
              imgName: 'sprite.png',
              cssName: 'sprite.css',
            }))
            .pipe(gulp.dest('src/spriteTmp'));
});

// sprite檔名加上hash
gulp.task('sprite-cachebust', ['sprite-gen'], function() {

  var gulpFilter = require('gulp-filter');
  var CacheBuster = require('gulp-cachebust');
  var cachebust = new CacheBuster();

  // 將新的sprite檔案加上hash
  gulp.src('src/spriteTmp/sprite.png')
      .pipe(plumber())
      .pipe(cachebust.resources())
      .pipe(gulp.dest('src/spriteTmp'));

  // 刪除sprite.png
  return gulp.src('src/spriteTmp/sprite.png')
      .pipe(plumber())
      .pipe(clean({
        force: true
      }));
});

// 將css引用sprite位置修改
gulp.task('sprite-replacePath', ['sprite-cachebust'], function() {

  var rename = require("gulp-rename");
  var tap = require('gulp-tap');
  var gulpFilter = require('gulp-filter');

  return gulp.src('src/spriteTmp/*.png') 
    .pipe(tap(function(file, t) {

      var match = file.path.match(/(sprite\.(.*)+\.png)$/);
      var regex = new RegExp('sprite\.' + match[2] +'\.png');

      console.log('regex', regex);

      gulp.src('src/spriteTmp/sprite.css')
        .pipe(plumber())
        .pipe(replace(/(sprite.*\.png)/g, '../img/sprite.' + match[2] + '.png'))
        .pipe(rename(function(path) {
          path.basename = "_sprite"
        }))
        .pipe(gulp.dest('src/postcss'));

      gulp.src('src/img/*.png')
      .pipe(plumber())
      .pipe(gulpFilter(function(file) {
        return /sprite\..*\.png$/.test(file.path) && !regex.test(file.path);
      }))
      .pipe(clean({
        force: true
      }));

    })).pipe(gulp.dest('src/img'));
}); 

// 清除sprite temp資料夾
gulp.task('sprite-cleanTmp', ['sprite-replacePath'], function() {
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
    var sprites = require('postcss-sprites'); // sprite
    var url = require("postcss-url")
    //var nested = require('postcss-nested');


    return gulp.watch('src/postcss/**/*.css', function(e) {
      gulp.src('src/postcss/**/*.css')
          .pipe(plumber())
          //.pipe( sourcemaps.init() )
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
            /*
            assets({
              basePath: 'src/',
              //cachebuster: true,
              relativeTo: 'img',
              //loadPaths: ['img/']
            }),
            */
            lost(),
            /*
            sprites({
              stylesheetPath: './src/css',
              spritePath: './src/img/sprite.png',
              retina: true,
              verbose: false,
              filterBy: function(image) {
                return /\.png$/gi.test(image.url);
              }
            }),
            */
            /*
            url({
              url: 'inline',
              basePath: 'src',
              //assetsPath: './src/img',
              useHash: true
            })
            */
            /*
            sprites({
              stylesheetPath: 'src/css',
              spritePath: 'src/img/sprite.png',
              retina: true,
              verbose: false,
              filterBy: function(image) {

                console.log('image', image);
                return /\.png$/gi.test(image.url);
              }
            }),
            */
            
            assets({
              basePath: 'src',
              //baseUrl: 'src/img',
              //cachebuster: true,
              relativeTo: 'src/css',
              loadPaths: ['img/']
            }),

            at2x({
              identifier: '@2x'
            })
            
          
          ]))
          //.pipe(sourcemaps.write('.'))
          /*
          .pipe(rename(function(path) {
            if (path.extname === '.pcss') {
              path.extname = ".css"
            }
          }))
          */

          .pipe(gulp.dest('src/css'));

    });
});

gulp.task('postcss', ['sprite', 'postcss-watch']);
















// css
// 合併global.css並壓縮複製所有/css到/dist/mobile/css
gulp.task('move-css', function() {

  var bundleFiles = filefolder.css.bundle;

  return gulp.src(bundleFiles)
    .pipe(plumber())
    .pipe(concat('bundle.css'))
    .pipe(gulp.dest(destPath + '/css'));
});


//gulp.src('**/*.svg', {cwd: 'path/to/assets'})
// svg sprite
// svg file please naming by Camel-Case  ex: ThisMySVGFile -> svgThisMySVGFile
gulp.task('svg-sprite-gen', function() {

  var config = {
    shape: {
      id: {
        separator: ''
      }
    },
    mode: {
      css: {
        dest: 'svgSpriteTemp',
        prefix: '.',
        sprite: 'svg-sprite.svg',
        dimensions: 'Dims',
        render: {
          //css: true,
          scss: {
            dest: '_svgSprite.scss'
          }
        },
        bust: true,
        example: false
      }
    }
  };

  return gulp.src(filefolder.img.svg.sprite)
      .pipe(plumber())
      .pipe(svgSprite(config))
      .pipe(gulp.dest(rootPath))
      .on('error', gutil.log);

});


gulp.task('svg-sprite-move', ['svg-sprite-gen'], function() {

  // 將舊的svg sprite檔案刪掉
  gulp.src(rootPath + '/img/*.svg')
      .pipe(plumber())
      .pipe(clean({
        force: true
      }))
      .on('error', gutil.log);

  // move svg sprite to design/img
  gulp.src(filefolder.img.svg.temp + '*.svg')
      .pipe(plumber())
      .pipe(gulp.dest(rootPath + '/img'))
      .on('error', gutil.log);


  // move svg scss to design/sass, and modify url path
  gulp.src(filefolder.img.svg.temp + '*.scss')
      .pipe(plumber())
      .pipe(replace(/(svg-sprite-.*\.svg)/g, '../img/$1'))
      .pipe(gulp.dest(rootPath + '/sass'))
      .on('error', gutil.log);


  // remove /svgSpriteTemp
  return gulp.src(filefolder.img.svg.temp)
      .pipe(plumber())
      .pipe(clean({
        force: true
      }))
      .on('error', gutil.log);

});


// 不一定要使用，webpack可設定將svg -> base64 encode
gulp.task('svg-sprite-watch', function() {
  gulp.watch(filefolder.img.svg.sprite, ['svg-sprite-move']);
});


// 壓縮圖片
gulp.task('minify-img', function() {

    gulp.src(filefolder.img.compress)
        .pipe(imagemin({
            optimizationLevel: 3,
            progressive: true,
            svgoPlugins: [{
              removeViewBox: false
            }],
            use: [imageminPngcrush()]
        }))
        .pipe(gulp.dest(destPath + '/img'))
        .on('error', gutil.log);

    /*
    return gulp.src(filefolder.img.move)
        .pipe(gulp.dest(destPath + '/img'))
        .on('error', gutil.log);
    */
});


// clean script
gulp.task('clean', function() {
    return gulp.src([destPath + '/css'], {
        read: false
    }).pipe(clean({
        force: true
    }));
});

gulp.task('clean-img', function() {
    return gulp.src([destPath + '/img'], {
        read: false
    }).pipe(clean({
        force: true
    }));
});
gulp.task('clean-all', ['clean', 'clean-img']);


// gulp task scripts
gulp.task('design', ['browser-sync', 'ejs-watch', 'svg-sprite-watch']);


// 將design檔案轉到server資料夾內
gulp.task('dist', function(cb) {
    runSequence('clean', 'move-css');
});

// 將design檔案轉到server資料夾內, 加圖片, depoly時應該都要跑過一遍, 確保design的檔案都有同步到server
gulp.task('dist-img', function(cb) {
    runSequence('clean-all', 'minify-img', 'move-css');
});
