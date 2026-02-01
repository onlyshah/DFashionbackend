module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Banner', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    image: { type: DataTypes.STRING(500), allowNull: true },
    // alias used in some seeders
    imageUrl: { type: DataTypes.STRING(500), allowNull: true },
    link: { type: DataTypes.STRING(500) },
    position: { type: DataTypes.ENUM('header', 'footer', 'sidebar', 'modal'), defaultValue: 'header' },
    startDate: { type: DataTypes.DATE },
    endDate: { type: DataTypes.DATE },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'banners', timestamps: true });
};
