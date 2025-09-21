export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    category?: string;
    sku?: string;
    manufacturer?: string;
    createdAt?: Date;
    updatedAt?: Date;
    status?: 'active' | 'inactive' | 'discontinued';
  }
  
  export interface Stock {
    productId: string;
    quantity: number;
    location: string;
    lastUpdated: Date;
    reserved?: number;
    inTransit?: number;
    status?: 'in_stock' | 'out_of_stock' | 'low_stock' | 'discontinued';
    minStockLevel?: number;
    maxStockLevel?: number;
  }
  
  export interface ProductWithStock extends Product {
    stock: number;
    inStock: boolean;
    stockLocation?: string;
    stockLastUpdated?: Date;
  }
  
  export interface CreateProductRequest {
    name: string;
    description?: string;
    price: number;
    category?: string;
    sku?: string;
    manufacturer?: string;
  }
  
  export interface UpdateProductRequest extends Partial<CreateProductRequest> {
    id: string;
  }