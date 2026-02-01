module.exports = (sequelize, DataTypes) => {
  return sequelize.define('InventoryAlert', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    type: { 
      type: DataTypes.ENUM('critical', 'warning', 'info'), 
      allowNull: false 
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE'
    },
    warehouseId: { 
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'warehouses', key: 'id' },
      onDelete: 'SET NULL'
    },
    status: { 
      type: DataTypes.ENUM('pending', 'acknowledged', 'resolved'), 
      defaultValue: 'pending' 
    },
    message: { 
      type: DataTypes.TEXT, 
      allowNull: false 
    },
    currentQuantity: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0 
    },
    minimumLevel: { 
      type: DataTypes.INTEGER, 
      defaultValue: 10 
    },
    acknowledgedBy: { 
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onDelete: 'SET NULL'
    },
    acknowledgedAt: { 
      type: DataTypes.DATE,
      allowNull: true
    },
    resolvedAt: { 
      type: DataTypes.DATE,
      allowNull: true
    }
  }, { 
    tableName: 'inventory_alerts', 
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};
