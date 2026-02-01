module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Inventory', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE'
    },
    warehouseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'warehouses', key: 'id' },
      onDelete: 'CASCADE'
    },
    sku: { 
      type: DataTypes.STRING(100), 
      allowNull: false,
      unique: true
    },
    quantity: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0,
      validate: { min: 0 }
    },
    minimumLevel: { 
      type: DataTypes.INTEGER, 
      defaultValue: 10 
    },
    maximumLevel: { 
      type: DataTypes.INTEGER, 
      defaultValue: 1000 
    },
    status: { 
      type: DataTypes.ENUM('active', 'inactive', 'discontinued'), 
      defaultValue: 'active' 
    },
    notes: { 
      type: DataTypes.TEXT 
    },
    lastUpdated: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW 
    },
    lastMovement: { 
      type: DataTypes.DATE,
      allowNull: true
    }
  }, { 
    tableName: 'inventories', 
    timestamps: true 
  });
};
