import { useState } from 'react';
import { useImport } from '../../provider';

export const SelectedLanguage = () => {
    const { state } = useImport();
    const [showPopup, setShowPopup] = useState(false);

    return (
        <div className="flex flex-col pr-6 py-2 w-full">
            <label className="pb-2">Selected language</label>
            <div className="relative">
                <input
                    type="text"
                    disabled
                    className="language-chooser-input"
                    value={state.languages?.find((language) => language.code === state.currentLanguage)?.name}
                />
                <span
                    className="absolute right-2 cursor-pointer bg-black text-white w-5 flex justify-center rounded-full top-1/4 text-sm"
                    onMouseEnter={() => setShowPopup(true)}
                    onMouseLeave={() => setShowPopup(false)}
                >
                    ?
                </span>
                {showPopup && (
                    <div className="absolute top-12 right-0 bg-white border p-4 shadow-md z-10 text-sm w-80">
                        If you want to change the language, go to settings and change the default language.
                    </div>
                )}
            </div>
        </div>
    );
};
