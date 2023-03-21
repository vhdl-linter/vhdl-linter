entity ent is
end entity;
architecture arch of ent is
  signal apple: integer;
begin
 process_label : process is
  begin
    report integer'image(apple);
  end process;
end architecture;