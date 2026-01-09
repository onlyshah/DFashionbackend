module.exports = (sequelize, DataTypes) => {
  return sequelize.define('StyleInspiration', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    image: { type: DataTypes.STRING(500) },
    season: { type: DataTypes.ENUM('spring', 'summer', 'fall', 'winter'), defaultValue: 'spring' },
    style: { type: DataTypes.STRING(100) },
    relatedProducts: { type: DataTypes.JSON, defaultValue: [] },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'style_inspiration', timestamps: true });
};
