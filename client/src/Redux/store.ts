import { configureStore } from "@reduxjs/toolkit"
import authReducer from "./reducers/RtcReducer/RtcSlice"

const Store = configureStore({
    reducer: {
        auth: authReducer,
    }
})

export type RootState = ReturnType<typeof Store.getState>
export type AppDispatch = typeof Store.dispatch
export default Store