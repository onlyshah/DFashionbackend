module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Category', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    slug: { type: DataTypes.STRING(200), allowNull: true }
  }, { tableName: 'categories', timestamps: true });
};
