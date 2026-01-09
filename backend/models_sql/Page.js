module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Page', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    slug: { type: DataTypes.STRING(200), unique: true },
    content: { type: DataTypes.TEXT },
    metaTitle: { type: DataTypes.STRING(300) },
    metaDescription: { type: DataTypes.TEXT },
    isPublished: { type: DataTypes.BOOLEAN, defaultValue: true },
    publishedAt: { type: DataTypes.DATE }
  }, { tableName: 'pages', timestamps: true });
};
