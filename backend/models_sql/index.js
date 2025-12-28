const { sequelize, Sequelize } = require('../config/sequelize');

const defineRole = require('./Role');
const defineUser = require('./User');
const defineBrand = require('./Brand');
const defineCategory = require('./Category');
const defineProduct = require('./Product');
const defineProductComment = require('./ProductComment');
const definePost = require('./Post');
const defineStory = require('./Story');
const defineReel = require('./Reel');

const Role = defineRole(sequelize, Sequelize.DataTypes);
const User = defineUser(sequelize, Sequelize.DataTypes);
const Brand = defineBrand(sequelize, Sequelize.DataTypes);
const Category = defineCategory(sequelize, Sequelize.DataTypes);
const Product = defineProduct(sequelize, Sequelize.DataTypes);
const ProductComment = defineProductComment(sequelize, Sequelize.DataTypes);
const Post = definePost(sequelize, Sequelize.DataTypes);
const Story = defineStory(sequelize, Sequelize.DataTypes);
const Reel = defineReel(sequelize, Sequelize.DataTypes);

module.exports = {
  sequelize,
  Sequelize,
  Role,
  User,
  Brand,
  Category,
  Product,
  ProductComment,
  Post,
  Story,
  Reel
};
