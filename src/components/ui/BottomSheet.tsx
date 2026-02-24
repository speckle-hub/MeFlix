"use client";

import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
    trigger?: React.ReactNode;
    title?: string;
    description?: string;
    children: React.ReactNode;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function BottomSheet({
    trigger,
    title,
    description,
    children,
    isOpen,
    onOpenChange
}: BottomSheetProps) {
    return (
        <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
            {trigger && <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>}
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-[92%] flex flex-col bg-surface border-t border-white/10 rounded-t-[32px] z-[10000] outline-none">
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-white/10 mt-4 mb-2" />

                    <div className="p-8 pt-4 overflow-y-auto">
                        {(title || description) && (
                            <div className="mb-6 space-y-1">
                                {title && <Drawer.Title className="text-xl font-bold text-white">{title}</Drawer.Title>}
                                {description && <Drawer.Description className="text-sm text-text-muted">{description}</Drawer.Description>}
                            </div>
                        )}
                        {children}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
