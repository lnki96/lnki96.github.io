require 'jekyll/document'
require 'fileutils'
require 'pathname'

module Jekyll::OptimizeMedia
  class ImgFile < Jekyll::StaticFile
    def write(dest)
      true
    end
  end

  class OptimizeImg < Jekyll::Generator
    safe true
    priority :lowest

    CONVERTER_BIN = File.join(File.dirname(__FILE__), "/optimize-img.sh")
    CMD_STR_SEP = " "
    DEST_EXT = ".webp"

    def getConfig(site)
      default = {
        'enabled' => false,
        'incremental' => site.config['incremental'],
        'quality' => 75,
        'img_dir' => "/assets/images"
      }
      default.merge(site.config['optmize_img'] || {})
    end

    def generate(site)
      config = getConfig(site)
      if !config['enabled']
        return
      end

      Jekyll.logger.info "OptimizeImg:","Processing " + config['img_dir']
      good = true
      for img_dir in Dir.glob(File.join(site.source, config['img_dir']) + "/**/")
        img_dir_relative_path = Pathname.new(img_dir).relative_path_from(Pathname.new(site.source)).to_s
        img_dest_dir = File.join(site.dest, img_dir_relative_path)
        for img in Dir.glob(img_dir + "*")
          if File.file?(img)
            cmd = "bash" + CMD_STR_SEP \
              + "\"" + CONVERTER_BIN + "\"" + CMD_STR_SEP \
              + "\"" + img + "\"" + CMD_STR_SEP \
              + config['quality'].to_s
            if !config['incremental']
              cmd = cmd + CMD_STR_SEP \
                + "--clean"
            end
            cmd = cmd + CMD_STR_SEP \
              + "\"" + img_dest_dir + "\""
            wasGood = system(cmd)
            img_dest = File.join(img_dest_dir, File.basename(img, ".*") + DEST_EXT)

            if wasGood && File.file?(img_dest)
              site.static_files << ImgFile.new(site, site.dest, img_dir_relative_path, File.basename(img_dest))
            elsif !wasGood && good
              good = false
            end
          end
        end
      end

      if good
        Jekyll.logger.info "OptimizeImg:","Complete processing " + config['img_dir']
      else
        Jekyll.logger.warn "OptimizeImg:","Complete with error while processing" + config['img_dir']
      end
    end
  end
end