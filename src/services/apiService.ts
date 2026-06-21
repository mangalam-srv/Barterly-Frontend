import { Product, User, ListingType, Testimonial, Chat, Message } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// --- LOCAL MOCK DATA FOR NON-LISTING FEATURES ---

const initialUsers: User[] = [
  { id: 'u1', name: 'Alice Johnson', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', location: 'San Francisco, CA', joinedDate: '2023-05-15' },
  { id: 'u2', name: 'Bob Williams', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e', location: 'New York, NY', joinedDate: '2023-08-20' },
  { id: 'u3', name: 'Charlie Brown', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704f', location: 'Austin, TX', joinedDate: '2024-01-10' },
];

const initialTestimonials: Testimonial[] = [
  { id: 't1', author: 'Sarah K.', role: 'Frequent Barterer', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026705d', comment: 'Barterly has been a game-changer! I\'ve traded my old books for amazing handcrafted jewelry. The community is fantastic and trustworthy.' },
  { id: 't2', author: 'Mike R.', role: 'Photographer', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026705e', comment: 'Renting camera gear through this platform was seamless and affordable. It saved me a fortune on my last project. Highly recommend!' },
  { id: 't3', author: 'Jenna L.', role: 'DIY Enthusiast', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026705f', comment: 'I love the flexibility of being able to both rent and barter. I rented out my power tools and bartered for some beautiful pottery.' },
];

const initialChats: Chat[] = [
  {
    id: 'c1',
    participants: [initialUsers[0], initialUsers[1]],
    product: {
      id: 'chat-product-1',
      title: 'Professional DSLR Camera',
      description: 'A sample chat item used for the local chat demo.',
      image: 'https://picsum.photos/seed/chat-product-1/600/400',
      type: ListingType.RENT,
      location: 'New York, NY',
      owner: initialUsers[1],
      postedDate: '2024-07-18',
    },
    messages: [
      { id: 'm1', senderId: 'u1', text: 'Hi Bob, I\'m interested in renting your DSLR for a weekend shoot.', timestamp: '2024-07-21T10:00:00Z' },
      { id: 'm2', senderId: 'u2', text: 'Hi Alice! Sounds good. Which weekend were you thinking?', timestamp: '2024-07-21T10:02:00Z' },
    ],
    lastMessage: 'Hi Alice! Sounds good. Which weekend were you thinking?',
    lastMessageTimestamp: '2024-07-21T10:02:00Z',
  },
  {
    id: 'c2',
    participants: [initialUsers[0], initialUsers[2]],
    product: {
      id: 'chat-product-2',
      title: 'Mountain Bike - Large Frame',
      description: 'A sample chat item used for the local chat demo.',
      image: 'https://picsum.photos/seed/chat-product-2/600/400',
      type: ListingType.BOTH,
      location: 'Austin, TX',
      owner: initialUsers[2],
      postedDate: '2024-07-15',
    },
    messages: [],
    lastMessage: 'Hey, saw your mountain bike listing. I have some camping gear to trade.',
    lastMessageTimestamp: '2024-07-20T15:30:00Z',
  },
];

let testimonials = initialTestimonials;
let chats = initialChats;

// --- INTERNAL HELPERS ---

const simulateNetwork = <T,>(data: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), 250 + Math.random() * 350));

const extractPayload = <T,>(responseData: any): T => {
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    return responseData.data as T;
  }
  return responseData as T;
};

const getToken = () => localStorage.getItem('token');

const buildHeaders = (isFormData = false): HeadersInit => {
  const headers: Record<string, string> = {};

  const token = getToken();

 console.log("BUILD HEADERS", {
  token: localStorage.getItem("token"),
  time: new Date().toISOString(),
});

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

const requestJson = async <T,>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message = body?.message || body?.error || 'Request failed';
    throw new Error(message);
  }

  return body as T;
};

const normalizeUser = (user: any): User => {
  const id = user?.id ?? user?._id ?? '';
  const fallbackAvatarSeed = encodeURIComponent(id || user?.name || 'user');

  return {
    id,
    name: user?.name ?? 'Unknown user',
    email: user?.email,
    avatar: user?.avatar ?? `https://i.pravatar.cc/150?u=${fallbackAvatarSeed}`,
    location: user?.location ?? '',
    joinedDate: user?.joinedDate ?? user?.createdAt,
  };
};

const normalizeProduct = (item: any): Product => {
  const owner = normalizeUser(item?.owner ?? {});

  return {
    id: item?._id ?? item?.id ?? '',
    title: item?.title ?? '',
    description: item?.description ?? '',
    image: item?.image ?? '',
    type: (item?.listingType ?? item?.type ?? ListingType.BARTER) as ListingType,
    location: item?.location ?? '',
    owner,
    postedDate: item?.createdAt ?? item?.postedDate ?? new Date().toISOString(),
  };
};

const normalizeProducts = (items: any[]): Product[] => items.map(normalizeProduct);

const toApiError = (error: unknown, fallbackMessage: string) => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(fallbackMessage);
};

const getListingPayload = (
  title: string,
  description: string,
  listingType: ListingType,
  location: string,
  imageFile: File
) => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('listingType', listingType);
  formData.append('location', location);
  formData.append('image', imageFile);
  return formData;
};

// --- API SERVICE ---

export const apiService = {
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    const response = await requestJson<any>('/api/v1/users/login', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ email, password }),
    });

    const payload = extractPayload<any>(response);
    return {
      user: normalizeUser(payload.user),
      token: payload.token,
    };
  },

  register: async (name: string, email: string, password: string): Promise<{ user: User; token: string }> => {
    const response = await requestJson<any>('/api/v1/users/register', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ name, email, password }),
    });

    const payload = extractPayload<any>(response);
    return {
      user: normalizeUser(payload.user),
      token: payload.token,
    };
  },

  

  fetchProducts: async (query: string = '', filters: { type?: ListingType | 'All' } = {}): Promise<Product[]> => {
   
    const response = await requestJson<any>('/api/v1/items');
    const payload = extractPayload<any>(response);

    const items = normalizeProducts(payload?.items ?? []);

    let filteredProducts = items;

    if (query) {
      const lowered = query.toLowerCase();
      filteredProducts = filteredProducts.filter((product) =>
        product.title.toLowerCase().includes(lowered) ||
        product.description.toLowerCase().includes(lowered) ||
        product.location.toLowerCase().includes(lowered)
      );
    }

    if (filters.type && filters.type !== 'All') {
      filteredProducts = filteredProducts.filter(
        (product) => product.type === filters.type || product.type === ListingType.BOTH
      );
    }

    return filteredProducts;
  },

  fetchProductById: async (id: string): Promise<Product | undefined> => {
    try {
      const response = await requestJson<any>(`/api/v1/items/${id}`);
      const payload = extractPayload<any>(response);
      return normalizeProduct(payload);
    } catch (error) {
      throw toApiError(error, 'Failed to fetch product');
    }
  },

  fetchLatestProducts: async (limit: number = 3): Promise<Product[]> => {
    const response = await requestJson<any>(`/api/v1/items?limit=${limit}`);
    const payload = extractPayload<any>(response);
    return normalizeProducts(payload?.items ?? []);
  },

  fetchTestimonials: (): Promise<Testimonial[]> => simulateNetwork(testimonials),

  fetchUserListings: async (_userId: string): Promise<Product[]> => {
    const response = await requestJson<any>('/api/v1/items/my-items', {
      headers: buildHeaders(),
    });
    const payload = extractPayload<any>(response);
    return normalizeProducts(payload?.items ?? []);
  },

  fetchMyItems: async (): Promise<Product[]> => {
    const response = await requestJson<any>('/api/v1/items/my-items', {
      headers: buildHeaders(),
    });
    const payload = extractPayload<any>(response);
    return normalizeProducts(payload?.items ?? []);
  },

  createListing: async (listingData: {
    title: string;
    description: string;
    type: ListingType;
    location: string;
    imageFile: File;
  }): Promise<Product> => {
    const response = await requestJson<any>('/api/v1/items/listitem', {
      method: 'POST',
      headers: buildHeaders(true),
      body: getListingPayload(
        listingData.title,
        listingData.description,
        listingData.type,
        listingData.location,
        listingData.imageFile
      ),
    });

    const payload = extractPayload<any>(response);
    return normalizeProduct(payload);
  },

  updateListing: async (
    id: string,
    listingData: {
      title?: string;
      description?: string;
      type?: ListingType;
      location?: string;
      imageFile?: File | null;
    }
  ): Promise<Product> => {
    const formData = new FormData();

    if (listingData.title !== undefined) formData.append('title', listingData.title);
    if (listingData.description !== undefined) formData.append('description', listingData.description);
    if (listingData.type !== undefined) formData.append('listingType', listingData.type);
    if (listingData.location !== undefined) formData.append('location', listingData.location);
    if (listingData.imageFile) formData.append('image', listingData.imageFile);

    const response = await requestJson<any>(`/api/v1/items/${id}`, {
      method: 'PUT',
      headers: buildHeaders(true),
      body: formData,
    });

    const payload = extractPayload<any>(response);
    return normalizeProduct(payload);
  },

  deleteListing: async (id: string): Promise<void> => {
    await requestJson<any>(`/api/v1/items/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
  },

  generateListingDescription: async (title: string, description?: string): Promise<string> => {
    const response = await requestJson<any>('/api/ai/generate-listing', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ title, description }),
    });

    const payload = extractPayload<any>(response);
    return payload?.generatedDescription ?? payload?.text ?? '';
  },

  fetchUserChats: (userId: string): Promise<Chat[]> => {
    return simulateNetwork(chats.filter((chat) => chat.participants.some((participant) => participant.id === userId)));
  },

  fetchChatById: (chatId: string): Promise<Chat | undefined> => {
    return simulateNetwork(chats.find((chat) => chat.id === chatId));
  },

  sendMessage: (chatId: string, text: string, senderId: string): Promise<Message> => {
    const chat = chats.find((entry) => entry.id === chatId);
    if (!chat) return Promise.reject(new Error('Chat not found'));

    const newMessage: Message = {
      id: `m${Date.now()}`,
      senderId,
      text,
      timestamp: new Date().toISOString(),
    };

    chat.messages.push(newMessage);
    chat.lastMessage = text;
    chat.lastMessageTimestamp = newMessage.timestamp;

    return simulateNetwork(newMessage);
  },
};
