/********************************************************************************** 
 * BTI325 – Assignment 04* I declare that this assignment is my own work in accordance with Seneca 
 * Academic Policy. No part* of this assignment has been copied manually or electronically from any 
 * other source* (including 3rd party web sites) or distributed to other students.
 * ** Name: Nishnath Bandari ID: 105202220 Date: 2023-10-20** 
 * *********************************************************************************/
const stripJs = require('strip-js');
const multer = require("multer");
const cloudinary = require('cloudinary').v2
const streamifier = require('streamifier')
const express = require('express');
const app = express();
const path = require('path');
const HTTP_PORT = process.env.PORT || 8080;
const blogService = require('./blog-service.js');
const exphbs = require('express-handlebars');


app.engine('hbs', exphbs.engine({
    extname: '.hbs',
    helpers: {
        navLink: function (url, options)
        {
            return '<li' +
                ((url == app.locals.activeRoute) ? ' class="active" ' : '') +
                '><a href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        equal: function (lvalue, rvalue, options)
        {
            if (arguments.length < 3)
                throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue)
            {
                return options.inverse(this);
            } else
            {
                return options.fn(this);
            }
        },
        safeHTML: function (context)
        {
            return stripJs(context);
        }
    }
}));
app.set('view engine', 'hbs');

cloudinary.config({
  cloud_name: 'dbhvcousj',
  api_key: '313446458445775',
  api_secret: '4HdHlqJioRkPJeTuV0E6ESIbvFA',
  secure: true
});
const upload = multer(); 

app.use(express.static('public'));

function startListening() {
    console.log("Express http server listening on: " + HTTP_PORT);
  }

app.use(function(req,res,next){
  let route = req.path.substring(1);
  app.locals.activeRoute = "/" + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, "") : route.replace(/\/(.*)/, ""));
  app.locals.viewingCategory = req.query.category;
  next();
});

app.get('/', (req, res) => {
    res.redirect('/blog');
});

app.get('/about', (req, res) => {
    res.render('about');
});

app.get('/posts/add', (req, res) => {
    res.render('addPost');
});

app.post('/posts/add', upload.single("featureImage"), (req, res) => {
  let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
          let stream = cloudinary.uploader.upload_stream(
              (error, result) => {
              if (result) {
                  resolve(result);
              } else {
                  reject(error);
              }
              }
          );
  
          streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
  };
  
  async function upload(req) {
      let result = await streamUpload(req);
      console.log(result);
      return result;
  }
  
  upload(req).then(async (uploaded)=>{
      req.body.featureImage = uploaded.url;
      try {
          const newPost = await blogService.addPost(req.body);
          res.redirect('/posts');
        } 
        catch (error) {
          res.status(500).send('Error adding post: ' + error.message);
        }
  });

});

app.get('/blog', async (req, res) => {

  let viewData = {};

  try{
      let posts = [];
      if(req.query.category){
          posts = await blogService.getPublishedPostsByCategory(req.query.category);
      }else{
          posts = await blogService.getPublishedPosts();
      }
      posts.sort((a,b) => new Date(b.postDate) - new Date(a.postDate));
      let post = posts[0]; 
      viewData.posts = posts;
      viewData.post = post;

  }catch(err){
      viewData.message = "no results";
  }

  try{
      let categories = await blogService.getCategories();
      viewData.categories = categories;
  }catch(err){
      viewData.categoriesMessage = "no results"
  }
  res.render("blog", {data: viewData})

});


app.get('/blog/:id', async (req, res) => {

  let viewData = {};
  try{
      let posts = [];
      if(req.query.category){
          posts = await blogService.getPublishedPostsByCategory(req.query.category);
      }else{
          posts = await blogService.getPublishedPosts();
      }
      posts.sort((a,b) => new Date(b.postDate) - new Date(a.postDate));
      viewData.posts = posts;

  }catch(err){
      viewData.message = "no results";
  }

  try{
      viewData.post = await blogService.getPostById(req.params.id);
  }catch(err){
      viewData.message = "no results"; 
  }

  try{
      let categories = await blogService.getCategories();
      viewData.categories = categories;
  }catch(err){
      viewData.categoriesMessage = "no results"
  }
  res.render("blog", {data: viewData})
});


app.get('/posts', (req, res) => {
  if (req.query.category) {
      blogService.getPostsByCategory(req.query.category)
          .then((result) => res.render('posts', { posts: result }))
          .catch((err) => res.send({ "message:": err }));
  } else if (req.query.minDate) {
      blogService.getPostsByMinDate(req.query.minDate)
          .then((result) => res.render('posts', { posts: result }))
          .catch((err) => res.send({ "message:": err }));
  } else {
      blogService.getAllPosts()
          .then((data) => res.render('posts', { posts: data }))
          .catch((err) => res.send({ message: "no results" }))
  }
});

app.get('/posts/:value', (req, res) =>
{
    serv.getPostById(req.params.value)
        .then(result => res.send(result))
        .catch(err => res.send({ "message": err }))
});
  

app.get('/categories', (req, res) => {
  blogService.getCategories()
      .then((data) => res.render('categories', { categories: data }))
      .catch((err) => res.render("categories", { message: "no results" }));
});

app.get('/categories', (req, res) => {
  blogService.getCategories().then(categories => {
      res.json(categories);
    }).catch(error => {
      res.status(404).json({ message: error });
    });
});

app.use((req, res) => {
  res.status(404).send("Code don't work... T.T");
});

blogService.initialize().then(() => {
    app.listen(HTTP_PORT, startListening);
  }).catch(() =>{
    console.error(error);
});