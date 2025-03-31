'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// Types for competitors
interface Competitor {
  id?: string;
  brand_id: string;
  name: string;
  website?: string;
  created_at?: string;
}

// Mock data for brands (in a real app, you'd fetch this from Supabase)
const mockBrands = [
  { id: 'brand-1', name: 'Your Brand' },
  { id: 'brand-2', name: 'Secondary Brand' },
];

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(mockBrands[0]?.id || '');
  
  // Fetch competitors on component mount
  useEffect(() => {
    const fetchCompetitors = async () => {
      if (!selectedBrandId) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('competitors')
          .select('*')
          .eq('brand_id', selectedBrandId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setCompetitors(data || []);
      } catch (err) {
        console.error('Error fetching competitors:', err);
        setError('Failed to load competitors. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCompetitors();
  }, [selectedBrandId]);
  
  // Initial form state
  const initialFormState: Competitor = {
    brand_id: selectedBrandId,
    name: '',
    website: '',
  };
  
  const [formData, setFormData] = useState<Competitor>(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Update form data when selected brand changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      brand_id: selectedBrandId,
    }));
  }, [selectedBrandId]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Validate form data
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.brand_id) errors.brand_id = 'Brand is required';
    if (!formData.name.trim()) errors.name = 'Name is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      if (isEditing && formData.id) {
        // Update existing competitor
        const { data, error } = await supabase
          .from('competitors')
          .update({
            name: formData.name,
            website: formData.website,
          })
          .eq('id', formData.id)
          .select();
        
        if (error) throw error;
        
        setCompetitors(competitors.map(c => c.id === formData.id ? data[0] : c));
      } else {
        // Create new competitor
        const { data, error } = await supabase
          .from('competitors')
          .insert([{
            brand_id: formData.brand_id,
            name: formData.name,
            website: formData.website,
          }])
          .select();
        
        if (error) throw error;
        
        setCompetitors([data[0], ...competitors]);
      }
      
      // Reset form
      setFormData({
        ...initialFormState,
        brand_id: selectedBrandId,
      });
      setIsEditing(false);
      setFormErrors({});
    } catch (err) {
      console.error('Error saving competitor:', err);
      setError('Failed to save competitor. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle edit competitor
  const handleEdit = (competitor: Competitor) => {
    setFormData(competitor);
    setIsEditing(true);
    window.scrollTo(0, 0);
  };
  
  // Handle delete competitor
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this competitor?')) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('competitors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setCompetitors(competitors.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting competitor:', err);
      setError('Failed to delete competitor. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Competitors</h1>
      
      {/* Brand Selector */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Brand
        </label>
        <select
          value={selectedBrandId}
          onChange={(e) => setSelectedBrandId(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md"
        >
          {mockBrands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Create/Edit Form */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {isEditing ? 'Edit Competitor' : 'Add New Competitor'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Competitor Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md ${
                  formErrors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.name && (
                <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://example.com"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...initialFormState,
                    brand_id: selectedBrandId,
                  });
                  setIsEditing(false);
                  setFormErrors({});
                }}
                className="px-4 py-2 mr-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEditing ? 'Update Competitor' : 'Add Competitor'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Competitors List */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          {mockBrands.find(b => b.id === selectedBrandId)?.name} Competitors
        </h2>
        
        {loading && competitors.length === 0 ? (
          <p className="text-gray-500">Loading competitors...</p>
        ) : competitors.length === 0 ? (
          <p className="text-gray-500">No competitors found. Add your first one!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Website
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added On
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {competitors.map((competitor) => (
                  <tr key={competitor.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{competitor.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {competitor.website ? (
                        <a 
                          href={competitor.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {competitor.website}
                        </a>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {competitor.created_at 
                        ? new Date(competitor.created_at).toLocaleDateString() 
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(competitor)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => competitor.id && handleDelete(competitor.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 