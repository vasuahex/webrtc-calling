import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit"

// export const upateUser = createAsyncThunk('authSlice/upateUser', async (data: { id: string, value: { name?: string, about?: string, profile?: string } }, thunkAPI) => {
//     try {
//         const res = await userService.upateUser(data.id, data.value)
//         return res

//     } catch (error: any) {
//         localStorage.removeItem("token")
//         return thunkAPI.rejectWithValue(error?.response?.data)
//     }
// })

interface AppState {
    screen: boolean,
    user: any;
    isError: boolean;
    isLoading: boolean;
    isProfileLoading: boolean;
    isSuccess: boolean;
    message: string;
    address: boolean;
    userName: string;
}

const initialState: AppState = {
    screen: false,
    user: null,
    isError: false,
    isLoading: false,
    isProfileLoading: false,
    isSuccess: false,
    message: "",
    address: false,
    userName: "",
};

const authSlice = createSlice({
    name: 'authSlice',
    initialState,
    reducers: {
        handleUser: (state, action) => {
            state.user = action.payload
        }
    },
    extraReducers: (builder) => {

    }

})

export const { handleUser } = authSlice.actions
export default authSlice.reducer