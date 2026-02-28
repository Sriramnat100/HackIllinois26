import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Image, Video, ZoomIn, Play, Grid, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const MediaGallery = ({ media = [] }) => {
  const [filter, setFilter] = useState("all");

  const filteredMedia = media.filter((item) => {
    if (filter === "all") return true;
    return item.type === filter;
  });

  const photoCount = media.filter((m) => m.type === "photo").length;
  const videoCount = media.filter((m) => m.type === "video").length;

  return (
    <div className="space-y-4" data-testid="media-gallery">
      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 px-3 text-[13px] font-medium",
            filter === "all" 
              ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" 
              : "text-slate-500 dark:text-slate-400"
          )}
          onClick={() => setFilter("all")}
          data-testid="filter-all"
        >
          <Grid className="w-4 h-4 mr-1.5" />
          All ({media.length})
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 px-3 text-[13px] font-medium",
            filter === "photo" 
              ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" 
              : "text-slate-500 dark:text-slate-400"
          )}
          onClick={() => setFilter("photo")}
          data-testid="filter-photos"
        >
          <Image className="w-4 h-4 mr-1.5" />
          Photos ({photoCount})
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 px-3 text-[13px] font-medium",
            filter === "video" 
              ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" 
              : "text-slate-500 dark:text-slate-400"
          )}
          onClick={() => setFilter("video")}
          data-testid="filter-videos"
        >
          <Video className="w-4 h-4 mr-1.5" />
          Videos ({videoCount})
        </Button>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredMedia.map((item) => (
          <Dialog key={item.id}>
            <DialogTrigger asChild>
              <div
                className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer group hover-lift"
                data-testid={`media-item-${item.id}`}
              >
                <img
                  src={item.thumbnail || item.url}
                  alt={item.caption || "Inspection media"}
                  className="w-full h-full object-cover"
                />
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-5 h-5 text-slate-900" />
                  </div>
                </div>
                {/* Video Indicator */}
                {item.type === "video" && (
                  <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                    <Play className="w-4 h-4 text-white fill-white" />
                  </div>
                )}
                {/* Caption Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-8">
                  <p className="text-[12px] text-white font-medium truncate">{item.caption}</p>
                  <p className="text-[10px] text-white/70 font-mono">{item.timestamp}</p>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-0">
              <div className="relative">
                <img
                  src={item.url}
                  alt={item.caption || "Inspection media"}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-5 pt-12">
                  <p className="text-white font-semibold text-[15px]">{item.caption}</p>
                  <p className="text-white/60 text-[13px] font-mono mt-1">{item.timestamp}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>

      {filteredMedia.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-7 h-7 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">No media found</p>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1">Capture photos and videos during inspection</p>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
