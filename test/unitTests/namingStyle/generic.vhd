entity ent is
  generic (
    apple : integer                     -- vhdl-linter-disable-line unused
    );
end entity;
architecture arch of ent is
begin
  process_label : process is
  begin
    report integer'image(apple);
  end process;
end architecture;
