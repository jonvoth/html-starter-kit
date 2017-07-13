var fs = require('fs');
var path = require('path');
var gulp = require('gulp');

// Load all gulp plugins automatically
// and attach them to the `plugins` object
var plugins = require('gulp-load-plugins')();

// Temporary solution until gulp 4
// https://github.com/gulpjs/gulp/issues/355
var runSequence = require('run-sequence');

var pkg = require('./package.json');
var dirs = pkg['environment-configs'].directories;

var server = require('gulp-server-livereload');
var watch = require('gulp-watch');
var uglify = require('gulp-uglifyjs');
var minifyCSS = require('gulp-minify-css');
var csscss = require('gulp-csscss');
var rename = require("gulp-rename");
var fileinclude = require('gulp-file-include');
var path = require('path');
var less = require('gulp-less');
var sass = require('gulp-sass');


// ---------------------------------------------------------------------
// | Helper tasks                                                      |
// ---------------------------------------------------------------------

gulp.task('archive:create_archive_dir', function () {
    fs.mkdirSync(path.resolve(dirs.archive), '0755');
});

gulp.task('archive:zip', function (done) {
    var archiveName = path.resolve(dirs.archive, pkg.name + '_v' + pkg.version + '.zip');
    var archiver = require('archiver')('zip');
    var files = require('glob').sync('**/*.*', {
        'cwd': dirs.dist,
        'dot': true // include hidden files
    });
    var output = fs.createWriteStream(archiveName);

    archiver.on('error', function (error) {
        done();
        throw error;
    });

    output.on('close', done);

    files.forEach(function (file) {
        var filePath = path.resolve(dirs.dist, file);

        // `archiver.bulk` does not maintain the file
        // permissions, so we need to add files individually
        archiver.append(fs.createReadStream(filePath), {
            'name': file,
            'mode': fs.statSync(filePath)
        });
    });

    archiver.pipe(output);
    archiver.finalize();
});



gulp.task('clean', function (done) {
    require('del')([
        dirs.archive,
        dirs.dist,
        dirs.temp
    ], done);
});

gulp.task('clean:temp', function (done) {
  require('del')([
    dirs.temp
  ], done);
});

gulp.task('clean:dist', function (done) {
  require('del')([
    dirs.dist
  ], done);
});



gulp.task('copy:temp', [
    'copy:temp:html',
    'copy:temp:js-vendor',
    'copy:temp:images',
    'copy:temp:fonts',
    'copy:temp:misc'
]);

gulp.task('copy:temp:html', function () {
    return gulp.src(dirs.src + '/*.html')
               .pipe(gulp.dest(dirs.temp));
});

gulp.task('copy:temp:js-vendor', function () {
  return gulp.src(dirs.src + '/js/vendor/**/*')
      .pipe(gulp.dest(dirs.temp + '/Scripts/'));
});

gulp.task('copy:temp:images', function () {
    return gulp.src(dirs.src + '/img/**/*')
        .pipe(gulp.dest(dirs.temp + '/Images/'));
});

gulp.task('copy:temp:fonts', function () {
  return gulp.src(dirs.src + '/fonts/**/*')
      .pipe(gulp.dest(dirs.temp + '/Styles/fonts/'));
});

gulp.task('copy:temp:misc', function () {
  return gulp.src([dirs.src + 'favicon.ico', dirs.src + 'robots.txt'])
      .pipe(gulp.dest(dirs.temp));
});

gulp.task('copy:dist', function () {
  return gulp.src(dirs.temp + '/**/*')
      .pipe(gulp.dest(dirs.dist + '/'));
});


gulp.task('uglify-js:temp', [
  'uglify-js:temp:main',
  'uglify-js:temp:enhancements'
]);

gulp.task('uglify-js:temp:main', function () {
  gulp.src(dirs.src + '/js/main.js')
      .pipe(uglify('main.min.js', {
        mangle: false,
        output: {
          beautify: true
        }
      }))
      .pipe(gulp.dest(dirs.temp + '/Scripts'))
});

gulp.task('uglify-js:temp:enhancements', function () {
  gulp.src(dirs.src + '/js/enhancements.js')
      .pipe(uglify('enhancements.min.js', {
        mangle: false,
        output: {
          beautify: true
        }
      }))
      .pipe(gulp.dest(dirs.temp + '/Scripts'))
});

gulp.task('uglify-js:dist', [
  'uglify-js:dist:main',
  'uglify-js:dist:enhancements'
]);

gulp.task('uglify-js:dist:main', function() {
  gulp.src(dirs.src + '/js/main.js')
      .pipe(uglify('main.min.js'))
      .pipe(gulp.dest(dirs.dist + '/Scripts'))
});

gulp.task('uglify-js:dist:enhancements', function() {
  gulp.src(dirs.src + '/js/enhancements.js')
      .pipe(uglify('enhancements.min.js'))
      .pipe(gulp.dest(dirs.dist + '/Scripts'))
});



gulp.task('sass:temp', function() {
  gulp.src([dirs.src + '/sass/styles.scss', dirs.src + '/sass/nomq.scss'])
      .pipe(sass({
        errLogToConsole: true
      }))
      .pipe(gulp.dest(dirs.temp + '/Styles/'))
});

gulp.task('sass:dist', function() {
  gulp.src(dirs.src + '/sass/**/*.scss')
      .pipe(sass({
        errLogToConsole: true
      }))
      .pipe(minifyCSS({
        keepBreaks:false
      }))
      .pipe(gulp.dest(dirs.dist + '/Styles/'))
});

gulp.task('less:temp', function() {
  gulp.src([dirs.src + '/less/styles.less', dirs.src + '/less/nomq.less'])
      .pipe(less({
        paths: [ path.join(__dirname, 'less', 'includes') ]
      }))
      .pipe(gulp.dest(dirs.temp + '/Styles/'))
});

gulp.task('less:dist', function() {
  gulp.src(dirs.src + '/less/**/*.scss')
      .pipe(sass({
        paths: [ path.join(__dirname, 'less', 'includes') ]
      }))
      .pipe(minifyCSS({
        keepBreaks:false
      }))
      .pipe(gulp.dest(dirs.dist + '/Styles/'))
});



gulp.task('fileinclude:temp', function() {
  gulp.src([dirs.src + '/*.html', '!' + dirs.src + '/include_*.html'])
      .pipe(fileinclude({
        prefix: '@@',
        basepath: '@file'
      }))
      .pipe(gulp.dest(dirs.temp));
});

gulp.task('fileinclude:dist', function() {
  gulp.src([dirs.src + '/*.html', '!' + dirs.src + '/include_*.html'])
      .pipe(fileinclude({
        prefix: '@@',
        basepath: '@file'
      }))
      .pipe(gulp.dest(dirs.dist));
});



gulp.task('webserver', function() {
  gulp.src('temp')
      .pipe(server({
        livereload: true,
        directoryListing: false,
        open: true,
        port: 8000
      }));
});



gulp.task('watch-html', function () {
  watch(dirs.src + '/*.html', function () {
    gulp.start('fileinclude:temp');
  });
});

gulp.task('watch-images', function () {
    watch(dirs.src + '/img/**/*', function () {
        gulp.start('copy:temp:images');
    });
});

gulp.task('watch-fonts', function () {
  watch(dirs.src + '/fonts/**/*', function () {
    gulp.start('copy:temp:fonts');
  });
});

gulp.task('watch-sass', function () {
  watch(dirs.src + '/sass/**/*', function () {
    gulp.start('sass:temp');
  });
});

gulp.task('watch-less', function () {
  watch(dirs.src + '/less/**/*', function () {
    gulp.start('less:temp');
  });
});

gulp.task('watch-js', function () {
  watch(dirs.src + '/js/**/*', function () {
    gulp.start('uglify-js:temp');
  });
});




// ---------------------------------------------------------------------
// | Main tasks                                                        |
// ---------------------------------------------------------------------

gulp.task('archive', function (done) {
    runSequence(
        'build',
        'archive:create_archive_dir',
        'archive:zip',
    done);
});

gulp.task('build', function (done) {
    runSequence(
        'clean:dist',
        'copy:dist',
        'fileinclude:dist',
        'uglify-js:dist',
        'less:dist',
    done);
});

gulp.task('default', function (done) {
  runSequence(
      'clean:temp',
      'copy:temp',
      'fileinclude:temp',
      'uglify-js:temp',
      'less:temp',
      'webserver',
      'watch-html',
      'watch-images',
      'watch-fonts',
      'watch-less',
      'watch-js',
      done);
});

gulp.task('analyze-css', function() {
  gulp.src(dirs.dist + '/Styles/**/*')
      .pipe(csscss())
});