import { useState } from "react";
import { useUsers } from "../contexts/UsersContext";

export default function AddUserModal({ onClose }: { onClose: () => void }) {
  const { createUser } = useUsers();
  const [form, setForm] = useState({
    name: "",
    address: "",
    username: "",
    password: "",
    email: "",
    phoneNumber: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    
    // Debug: Log the form data being submitted
    console.log('🧪 Form data being submitted:', form);
    
    // Check required fields (all fields are required due to the validation)
    if (Object.values(form).some((v) => !v.trim())) {
      console.log('❌ Validation failed: Some fields are empty');
      console.log('📝 Field values:', Object.entries(form).map(([key, value]) => `${key}: "${value}"`));
      return;
    }
    
    console.log('✅ All fields validated, creating user...');
    createUser(form);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <form
        onSubmit={save}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-4 sm:p-6 shadow-lg max-h-[90vh] overflow-y-auto"
      >
        <h3 className="text-xl font-bold">Create New User</h3>

        {["name", "address", "username", "password", "email", "phoneNumber"].map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium capitalize">
              {field === "phoneNumber" ? "Phone Number" : field}
            </label>
            <input
              type={field === "password" ? "password" : field === "email" ? "email" : field === "phoneNumber" ? "tel" : "text"}
              name={field}
              value={form[field as keyof typeof form]}
              onChange={handleChange}
              className="mt-1 w-full rounded border px-3 py-3 text-base touch-manipulation focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        ))}

        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-4 py-3 text-base touch-manipulation min-h-[48px] hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-emerald-600 px-4 py-3 text-white text-base touch-manipulation min-h-[48px] hover:bg-emerald-700"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

